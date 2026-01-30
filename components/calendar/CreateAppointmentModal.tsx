"use client";

/**
 * Modal de création de rendez-vous (Story 3.3 - Task 1).
 *
 * - S'ouvre au clic sur un créneau vide dans l'agenda
 * - Formulaire: patient (PatientSelect), date/heure de début, durée, type, notes
 * - Pré-remplit la date/heure selon le créneau cliqué
 * - Valide avec Zod, vérifie les conflits côté serveur, affiche toast et met à jour l'agenda
 */

import * as React from "react";
import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientSelect } from "@/components/calendar/PatientSelect";
import {
  appointmentSchema,
  type AppointmentFormValues,
} from "@/lib/validations/appointment";
import { APPOINTMENT_DURATIONS, APPOINTMENT_TYPES } from "@/lib/validations/appointment";
import { createAppointment, updateAppointment } from "@/app/dashboard/calendar/actions";
import type { AppointmentWithPatient } from "@/types";
import { getDurationMinutes } from "@/components/calendar/calendar-utils";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { cn } from "@/lib/utils";

export interface CreateAppointmentModalProps {
  /** Contrôle l'ouverture du modal */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Date/heure de début pré-remplies (créneau cliqué). Si non fourni, défaut = maintenant */
  defaultStartTime?: Date;
  /** En mode édition: RDV existant à modifier (pré-remplit le formulaire, submit appelle updateAppointment) */
  appointment?: AppointmentWithPatient | null;
  /** Appelé après création ou modification réussie (ex: fermer le modal de détails) */
  onSuccess?: () => void;
}

/**
 * Crée une date pour l'input datetime-local (format ISO local sans timezone).
 */
function toDatetimeLocalString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Parse une chaîne datetime-local en Date (heure locale).
 */
function fromDatetimeLocalString(s: string): Date {
  return new Date(s);
}

/**
 * Modal de création de RDV avec formulaire validé (Zod) et vérification des conflits.
 */
export function CreateAppointmentModal({
  open,
  onOpenChange,
  defaultStartTime,
  appointment: editAppointment,
  onSuccess,
}: CreateAppointmentModalProps) {
  const clearCache = useCalendarStore((s) => s.clearCache);
  const isEdit = Boolean(editAppointment);

  const durationFromAppointment = editAppointment
    ? getDurationMinutes(editAppointment.startTime, editAppointment.endTime)
    : 30;
  const durationValid = [15, 30, 45, 60].includes(durationFromAppointment)
    ? durationFromAppointment
    : 30;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: editAppointment?.patientId ?? "",
      startTime: editAppointment?.startTime ?? defaultStartTime ?? new Date(),
      duration: durationValid,
      type: editAppointment?.type ?? "Suivi",
      notes: editAppointment?.notes ?? "",
    },
  });

  // Réinitialiser / pré-remplir quand le modal s'ouvre (création) ou quand on passe en édition
  useEffect(() => {
    if (open) {
      if (editAppointment) {
        const dur = getDurationMinutes(editAppointment.startTime, editAppointment.endTime);
        reset({
          patientId: editAppointment.patientId,
          startTime: editAppointment.startTime,
          duration: [15, 30, 45, 60].includes(dur) ? dur : 30,
          type: editAppointment.type,
          notes: editAppointment.notes ?? "",
        });
      } else {
        const start = defaultStartTime ?? new Date();
        reset({
          patientId: "",
          startTime: start,
          duration: 30,
          type: "Suivi",
          notes: "",
        });
      }
    }
  }, [open, defaultStartTime, editAppointment, reset]);

  const onSubmit = useCallback(
    async (values: AppointmentFormValues) => {
      if (isEdit && editAppointment) {
        const result = await updateAppointment(editAppointment.id, values);
        if (result.success) {
          toast.success("Rendez-vous modifié", {
            description: "Les modifications ont été enregistrées.",
          });
          clearCache();
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error("Modification impossible", { description: result.error });
        }
      } else {
        const result = await createAppointment(values);
        if (result.success) {
          toast.success("Rendez-vous créé", {
            description: "Le rendez-vous a été enregistré.",
          });
          clearCache();
          onOpenChange(false);
          onSuccess?.();
        } else {
          toast.error("Création impossible", { description: result.error });
        }
      }
    },
    [clearCache, isEdit, editAppointment, onOpenChange, onSuccess]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifiez l'horaire, le type ou les notes."
              : "Renseignez le patient, l'horaire et le type de consultation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Patient: sélection avec recherche + option "Nouveau patient" */}
          <Controller
            control={control}
            name="patientId"
            render={({ field }) => (
              <PatientSelect
                value={field.value}
                onChange={(id) => field.onChange(id)}
                error={errors.patientId?.message}
              />
            )}
          />

          {/* Date et heure de début — InputGroup + input type datetime-local */}
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor="startTime">Date et heure de début</Label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={toDatetimeLocalString(field.value)}
                  onChange={(e) => field.onChange(fromDatetimeLocalString(e.target.value))}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    errors.startTime && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                  aria-invalid={!!errors.startTime}
                />
                {errors.startTime?.message && (
                  <p className="text-sm text-rose-500" role="alert">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* Durée — select 15, 30, 45, 60 min */}
          <div className="space-y-2">
            <Label htmlFor="duration">Durée</Label>
            <select
              id="duration"
              {...register("duration", { valueAsNumber: true })}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                errors.duration && "border-rose-500 focus-visible:ring-rose-500"
              )}
              aria-invalid={!!errors.duration}
            >
              {APPOINTMENT_DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
            {errors.duration?.message && (
              <p className="text-sm text-rose-500" role="alert">
                {errors.duration.message}
              </p>
            )}
          </div>

          {/* Type de consultation */}
          <div className="space-y-2">
            <Label htmlFor="type">Type de consultation</Label>
            <select
              id="type"
              {...register("type")}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                errors.type && "border-rose-500 focus-visible:ring-rose-500"
              )}
              aria-invalid={!!errors.type}
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type?.message && (
              <p className="text-sm text-rose-500" role="alert">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Notes optionnelles — InputGroup avec Textarea (convention: label + champ + erreur) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Notes libres…"
              maxLength={500}
              className={cn(errors.notes && "border-rose-500 focus-visible:ring-rose-500")}
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="text-sm text-rose-500" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#2563eb] hover:bg-[#2563eb]/90"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEdit
                  ? "Enregistrement…"
                  : "Création…"
                : isEdit
                  ? "Enregistrer les modifications"
                  : "Créer le rendez-vous"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
