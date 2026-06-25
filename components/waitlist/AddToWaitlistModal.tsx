"use client";

/**
 * Modale d'ajout d'un patient à la liste d'attente (story 8.5).
 *
 * `react-hook-form` + `zodResolver(waitlistEntrySchema)`. Réutilise `PatientSelect`
 * (même composant que la modal de création de RDV) et le catalogue `ServiceType`
 * actif (soin souhaité optionnel). La fenêtre de dates est facultative ; ses
 * bornes sont converties en `Date` UTC-minuit (cohérent avec `@db.Date`, comme
 * `TimeOff`) pour éviter toute dérive de fuseau au stockage.
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
import { addToWaitlist } from "@/app/dashboard/waitlist/actions";
import {
  getServiceTypes,
  type ServiceTypeDTO,
} from "@/app/dashboard/settings/services/actions";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { WaitlistPriorityLabels, type WaitlistPriority } from "@/types";
import { cn } from "@/lib/utils";

export interface AddToWaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après ajout réussi (refresh de la liste). */
  onSuccess?: () => void;
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

export function AddToWaitlistModal({
  open,
  onOpenChange,
  onSuccess,
}: AddToWaitlistModalProps) {
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
    defaultValues: {
      patientId: "",
      priority: "NORMAL",
      reason: "",
      notes: "",
    },
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

  // Réinitialisation à chaque ouverture.
  useEffect(() => {
    if (open) {
      reset({ patientId: "", priority: "NORMAL", reason: "", notes: "" });
    }
  }, [open, reset]);

  const reasonValue = watch("reason") ?? "";

  const onSubmit = async (values: WaitlistEntryFormValues) => {
    const result = await addToWaitlist(values);
    if (result.success) {
      showSuccess(TOAST_MESSAGES.waitlist.added);
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
          <DialogTitle>Ajouter à la liste d'attente</DialogTitle>
          <DialogDescription>
            Inscrivez un patient en attente d'un créneau, avec son niveau d'urgence.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-1"
        >
          {/* Patient */}
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
              <select
                id="serviceTypeId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("serviceTypeId", {
                  setValueAs: (v) => (v === "" ? undefined : v),
                })}
              >
                <option value="">Tout soin</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
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
              loadingText="Ajout…"
            >
              Ajouter à la liste
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
