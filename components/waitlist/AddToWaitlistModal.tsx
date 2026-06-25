"use client";

/**
 * Modale d'ajout **ou d'édition** d'une entrée de liste d'attente (story 8.5).
 *
 * `react-hook-form` + `zodResolver(waitlistEntrySchema)`. Réutilise `PatientSelect`
 * (même composant que la modal de création de RDV) et le catalogue `ServiceType`
 * actif (soin souhaité optionnel). La fenêtre de dates est facultative ; ses
 * bornes sont converties en `Date` UTC-minuit (cohérent avec `@db.Date`, comme
 * `TimeOff`) pour éviter toute dérive de fuseau au stockage.
 *
 * Mode **édition** (prop `entry` fournie, AC 8) : pré-remplit le formulaire,
 * affiche le patient en lecture seule (on ne change pas le patient d'une demande)
 * et route la soumission vers `updateWaitlistEntry`. Le même schéma sert aux deux
 * modes (`patientId` reste pré-rempli mais figé ; le serveur le réignore via
 * `waitlistEntryUpdateSchema`).
 *
 * @module components/waitlist/AddToWaitlistModal
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientSelect } from "@/components/calendar/PatientSelect";
import {
  waitlistEntrySchema,
  type WaitlistEntryFormValues,
  type WaitlistEntryFormInput,
} from "@/lib/validations/waitlist";
import {
  addToWaitlist,
  updateWaitlistEntry,
} from "@/app/dashboard/waitlist/actions";
import {
  getServiceTypes,
  type ServiceTypeDTO,
} from "@/app/dashboard/settings/services/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import {
  WaitlistPriorityLabels,
  type WaitlistPriority,
  type WaitlistEntryWithPatient,
} from "@/types";
import { cn } from "@/lib/utils";

export interface AddToWaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après ajout/édition réussi (refresh de la liste). */
  onSuccess?: () => void;
  /**
   * Entrée à éditer. Présente → **mode édition** (pré-remplissage, patient en
   * lecture seule, `updateWaitlistEntry`). Absente/`null` → **mode ajout**.
   */
  entry?: WaitlistEntryWithPatient | null;
}

/** "yyyy-mm-dd" → `Date` UTC-minuit (cohérent avec `@db.Date`). Vide → undefined. */
function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if ([y, m, d].some((n) => Number.isNaN(n))) return undefined;
  return new Date(Date.UTC(y, m - 1, d));
}

/** `Date` UTC → "yyyy-mm-dd" pour `<input type="date">`. */
function toDateInput(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PRIORITIES: WaitlistPriority[] = ["NORMAL", "HIGH", "URGENT"];

/** Valeurs de formulaire vierges (mode ajout). */
const EMPTY_FORM: WaitlistEntryFormInput = {
  patientId: "",
  priority: "NORMAL",
  reason: "",
  notes: "",
};

/** Projette une entrée existante vers les valeurs du formulaire (mode édition). */
function entryToForm(entry: WaitlistEntryWithPatient): WaitlistEntryFormInput {
  return {
    patientId: entry.patientId,
    serviceTypeId: entry.serviceType?.id,
    priority: entry.priority,
    reason: entry.reason ?? "",
    notes: entry.notes ?? "",
    preferredFrom: entry.preferredFrom ?? undefined,
    preferredTo: entry.preferredTo ?? undefined,
  };
}

export function AddToWaitlistModal({
  open,
  onOpenChange,
  onSuccess,
  entry = null,
}: AddToWaitlistModalProps) {
  const isEdit = entry != null;
  const [services, setServices] = useState<ServiceTypeDTO[]>([]);

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistEntryFormInput, unknown, WaitlistEntryFormValues>({
    resolver: zodResolver(waitlistEntrySchema),
    defaultValues: EMPTY_FORM,
  });

  // Catalogue des services actifs (soin souhaité optionnel).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getServiceTypes()
      .then((all) => {
        if (!cancelled) setServices(all.filter((s) => s.active));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Réinitialisation à chaque ouverture : pré-rempli en édition, vierge en ajout.
  useEffect(() => {
    if (open) {
      reset(entry ? entryToForm(entry) : EMPTY_FORM);
    }
  }, [open, entry, reset]);

  // Options de soin : services actifs + (en édition) le soin de l'entrée s'il est
  // archivé/absent du catalogue, pour qu'il reste sélectionnable et visible.
  const serviceOptions: Pick<ServiceTypeDTO, "id" | "label">[] = React.useMemo(() => {
    if (entry?.serviceType && !services.some((s) => s.id === entry.serviceType!.id)) {
      return [entry.serviceType, ...services];
    }
    return services;
  }, [services, entry]);

  const reasonValue = watch("reason") ?? "";

  const onSubmit = async (values: WaitlistEntryFormValues) => {
    const result = isEdit
      ? await updateWaitlistEntry(entry.id, values)
      : await addToWaitlist(values);
    if (result.success) {
      showSuccess(
        isEdit ? TOAST_MESSAGES.waitlist.updated : TOAST_MESSAGES.waitlist.added,
      );
      onOpenChange(false);
      onSuccess?.();
    } else {
      showError(result.error || TOAST_MESSAGES.errors.server);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'entrée" : "Ajouter à la liste d'attente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour l'urgence, le soin souhaité, la fenêtre de dates ou le motif."
              : "Inscrivez un patient en attente d'un créneau, avec son niveau d'urgence."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1"
        >
          {/* Patient : sélectionnable en ajout, figé en lecture seule en édition
              (on ne change pas le patient d'une demande). */}
          {isEdit ? (
            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {`${entry.patient.firstName} ${entry.patient.lastName}`.trim() ||
                  "Patient"}
              </div>
            </div>
          ) : (
            <Controller
              control={control}
              name="patientId"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>
                    Patient<span className="ml-0.5 text-rose-500">*</span>
                  </Label>
                  <PatientSelect
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    error={errors.patientId?.message}
                    placeholder="Rechercher un patient…"
                    hideLabel
                  />
                </div>
              )}
            />
          )}

          {/* Priorité + type de soin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Niveau d'urgence</Label>
              <select
                id="priority"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("priority")}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {WaitlistPriorityLabels[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceTypeId">Type de soin souhaité</Label>
              {/* Controller (et non `register`) : la valeur reste pilotée par RHF
                  même quand les options arrivent après coup (pré-remplissage en
                  édition robuste au chargement async du catalogue). */}
              <Controller
                control={control}
                name="serviceTypeId"
                render={({ field }) => (
                  <select
                    id="serviceTypeId"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : e.target.value)
                    }
                  >
                    <option value="">Tout soin</option>
                    {serviceOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          {/* Fenêtre de dates souhaitée (optionnelle) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="preferredFrom">Disponible à partir du</Label>
              <Controller
                control={control}
                name="preferredFrom"
                render={({ field }) => (
                  <Input
                    id="preferredFrom"
                    type="date"
                    value={toDateInput(field.value)}
                    onChange={(e) => field.onChange(parseDateInput(e.target.value))}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredTo">Jusqu'au</Label>
              <Controller
                control={control}
                name="preferredTo"
                render={({ field }) => (
                  <Input
                    id="preferredTo"
                    type="date"
                    value={toDateInput(field.value)}
                    onChange={(e) => field.onChange(parseDateInput(e.target.value))}
                  />
                )}
              />
            </div>
          </div>
          {errors.preferredTo?.message && (
            <p className="text-xs text-rose-500" role="alert">
              {errors.preferredTo.message}
            </p>
          )}

          {/* Motif */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reason">Motif</Label>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  reasonValue.length > 180 ? "text-rose-500" : "text-muted-foreground",
                )}
              >
                {reasonValue.length} / 200
              </span>
            </div>
            <Input
              id="reason"
              maxLength={200}
              placeholder="Ex. : douleur persistante, demande de suivi rapproché…"
              {...register("reason")}
            />
            {errors.reason?.message && (
              <p className="text-xs text-rose-500" role="alert">
                {errors.reason.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes internes</Label>
            <Textarea
              id="notes"
              rows={3}
              maxLength={500}
              placeholder="Contexte particulier (visible uniquement par vous)"
              className="resize-none"
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="text-xs text-rose-500" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText={isEdit ? "Enregistrement…" : "Ajout…"}
            >
              {isEdit ? "Enregistrer" : "Ajouter à la liste"}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
