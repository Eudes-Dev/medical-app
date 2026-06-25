"use client";

/**
 * Modal de création / édition d'un rendez-vous (Story 3.3, étendu 7.3).
 *
 * Refonte UI (v2) inspirée de la maquette de référence :
 * - Sections visuelles claires (PATIENT / DATE & CRÉNEAU / DURÉE / TYPE / NOTES).
 * - Pickers date + heure en cartes côte à côte, avec aperçu de l'heure de fin.
 * - Sélecteur de durée en "pill segmented control".
 * - Type de soin (story 7.3) : liste **dynamique** des `ServiceType` actifs
 *   (remplace l'ancienne enum statique `APPOINTMENT_TYPES`), avec pastille de
 *   couleur. Le choix d'un service pré-remplit la durée (`durationMin`). Les RDV
 *   legacy (type libre sans service) restent éditables sans perte du libellé.
 *
 * @module components/calendar/CreateAppointmentModal
 */

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PatientSelect } from "@/components/calendar/PatientSelect";
import {
  appointmentSchema,
  APPOINTMENT_DURATIONS,
  RECURRENCE_MIN_OCCURRENCES,
  RECURRENCE_MAX_OCCURRENCES,
  type AppointmentFormValues,
} from "@/lib/validations/appointment";
import {
  createAppointment,
  createRecurringAppointments,
  updateAppointment,
} from "@/app/dashboard/calendar/actions";
import { Switch } from "@/components/ui/switch";
import {
  buildRecurrenceDates,
  type RecurrenceFrequency,
} from "@/components/calendar/recurrence-utils";
import {
  getServiceTypes,
  type ServiceTypeDTO,
} from "@/app/dashboard/settings/services/actions";
import { getServiceColor } from "@/lib/cabinet/service-colors";
import type { AppointmentWithPatient } from "@/types";
import { getDurationMinutes } from "@/components/calendar/calendar-utils";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";

// ─────────────────────────────────────────────────────────────────────────────
// Types & constantes
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAppointmentModalProps {
  /** Contrôle l'ouverture du modal */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Date/heure de début pré-remplies (créneau cliqué). Par défaut: maintenant. */
  defaultStartTime?: Date;
  /** En mode édition : RDV existant à modifier */
  appointment?: AppointmentWithPatient | null;
  /**
   * Pré-remplissage en mode **création** (story 8.5, conversion liste d'attente).
   * Présélectionne le patient et, si fourni, le type de soin (et sa durée). Sans
   * effet en mode édition (`appointment` fourni).
   */
  initialPatientId?: string;
  initialServiceTypeId?: string;
  /**
   * Appelé après création / modification réussie. En création, reçoit le RDV créé
   * (story 8.5) pour permettre l'orchestration post-création (ex. marquer une
   * entrée de liste d'attente comme programmée).
   */
  onSuccess?: (appointment?: AppointmentWithPatient) => void;
}

/**
 * Durée "recommandée" par défaut (alignée sur le créneau de la grille = 30 min).
 */
const RECOMMENDED_DURATION = 30;

/** Libellé compact des durées pour le pill segmented control. */
const DURATION_LABELS: Record<number, string> = {
  15: "15m",
  30: "30m",
  45: "45m",
  60: "1h",
  90: "1h30",
};

/** Libellés FR des fréquences de récurrence (story 8.4). */
const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: "Hebdomadaire",
  biweekly: "Toutes les 2 semaines",
  monthly: "Mensuelle",
};

/** Nombre d'occurrences par défaut d'une nouvelle série (story 8.4). */
const DEFAULT_OCCURRENCES = 4;

/**
 * Ramène un nombre d'occurrences saisi dans les bornes valides [2,26] (story 8.4).
 * Garantit que l'aperçu **et** la valeur soumise restent cohérents même si le
 * champ contient une saisie hors bornes / vide (`NaN`).
 */
function clampOccurrences(n: number): number {
  if (!Number.isFinite(n)) return RECURRENCE_MIN_OCCURRENCES;
  return Math.min(
    RECURRENCE_MAX_OCCURRENCES,
    Math.max(RECURRENCE_MIN_OCCURRENCES, Math.trunc(n)),
  );
}

/** Libellé court d'une durée pour les options de la liste de services. */
function shortDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de conversion date <-> input HTML
// ─────────────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD attendu par <input type="date"> (zone locale, pas d'UTC). */
function toDateInputString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HH:mm attendu par <input type="time">. */
function toTimeInputString(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Fusionne une chaîne date (YYYY-MM-DD) + heure (HH:mm) en Date locale.
 * Si l'une des deux est invalide on retourne `prev` pour ne pas casser le form.
 */
function mergeDateAndTime(dateStr: string, timeStr: string, prev: Date): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return prev;
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : libellé "small caps" façon maquette
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({
  htmlFor,
  required,
  children,
  right,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {children}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function CreateAppointmentModal({
  open,
  onOpenChange,
  defaultStartTime,
  appointment: editAppointment,
  initialPatientId,
  initialServiceTypeId,
  onSuccess,
}: CreateAppointmentModalProps) {
  const clearCache = useCalendarStore((s) => s.clearCache);
  const isEdit = Boolean(editAppointment);

  // Story 8.5 : garde-fou pour n'appliquer la durée du soin pré-rempli qu'une
  // seule fois par ouverture (évite d'écraser une durée éditée manuellement).
  const prefillDurationApplied = React.useRef(false);

  /** Catalogue des services actifs (story 7.3), chargé à l'ouverture. */
  const [services, setServices] = useState<ServiceTypeDTO[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  /** Service sélectionné. `""` = repli / RDV legacy (type libre conservé). */
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Récurrence (story 8.4) — état **local** (hors `appointmentSchema`), rendu
  // uniquement en création (`!isEdit`). Désactivée par défaut → flux 3.3 inchangé.
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [occurrences, setOccurrences] = useState<number>(DEFAULT_OCCURRENCES);

  // Durée déduite du RDV en édition (sinon valeur par défaut = recommandée).
  const initialDuration = useMemo(() => {
    if (!editAppointment) return RECOMMENDED_DURATION;
    const d = getDurationMinutes(
      editAppointment.startTime,
      editAppointment.endTime,
    );
    return APPOINTMENT_DURATIONS.includes(
      d as (typeof APPOINTMENT_DURATIONS)[number],
    )
      ? d
      : RECOMMENDED_DURATION;
  }, [editAppointment]);

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: editAppointment?.patientId ?? initialPatientId ?? "",
      startTime: editAppointment?.startTime ?? defaultStartTime ?? new Date(),
      duration: initialDuration,
      notes: editAppointment?.notes ?? "",
    },
  });

  const watchedStart = watch("startTime");
  const watchedDuration = watch("duration");
  const watchedNotes = watch("notes") ?? "";

  const endTime = useMemo(() => {
    if (!(watchedStart instanceof Date)) return null;
    return new Date(watchedStart.getTime() + watchedDuration * 60_000);
  }, [watchedStart, watchedDuration]);

  // Nombre d'occurrences effectif (clampé) — source unique pour l'aperçu ET la
  // soumission, pour qu'ils ne divergent jamais (QA 8.4).
  const effectiveOccurrences = clampOccurrences(occurrences);
  // La saisie brute est-elle hors bornes / vide ? → validation inline.
  const occurrencesOutOfRange =
    !Number.isInteger(occurrences) ||
    occurrences < RECURRENCE_MIN_OCCURRENCES ||
    occurrences > RECURRENCE_MAX_OCCURRENCES;

  // Aperçu des dates de la série (story 8.4) : recalculé à la volée depuis la
  // date de début, la fréquence et le nombre d'occurrences. Reflète exactement
  // les créneaux qui seront tentés (même heure de début que la 1ʳᵉ occurrence).
  const recurrenceDates = useMemo(() => {
    if (!recurring || !(watchedStart instanceof Date)) return [];
    return buildRecurrenceDates(watchedStart, frequency, effectiveOccurrences);
  }, [recurring, watchedStart, frequency, effectiveOccurrences]);

  // Chargement des services actifs à l'ouverture.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setServicesLoading(true);
    getServiceTypes()
      .then((all) => {
        if (cancelled) return;
        setServices(all.filter((s) => s.active));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Réinitialisation à l'ouverture (création) / passage en édition.
  useEffect(() => {
    if (!open) return;
    if (editAppointment) {
      reset({
        patientId: editAppointment.patientId,
        startTime: editAppointment.startTime,
        duration: initialDuration,
        notes: editAppointment.notes ?? "",
      });
      setSelectedServiceId(editAppointment.serviceTypeId ?? "");
    } else {
      reset({
        patientId: initialPatientId ?? "",
        startTime: defaultStartTime ?? new Date(),
        duration: RECOMMENDED_DURATION,
        notes: "",
      });
      // Story 8.5 : pré-sélection du soin visé par l'entrée de liste d'attente
      // (sa durée est appliquée par l'effet de présélection ci-dessous).
      setSelectedServiceId(initialServiceTypeId ?? "");
    }
    // Récurrence remise à zéro à chaque (ré)ouverture (story 8.4).
    setRecurring(false);
    setFrequency("weekly");
    setOccurrences(DEFAULT_OCCURRENCES);
    // Réarme l'application de la durée pré-remplie pour cette ouverture (8.5).
    prefillDurationApplied.current = false;
  }, [open, defaultStartTime, editAppointment, initialDuration, initialPatientId, initialServiceTypeId, reset]);

  // En création, présélectionne le premier service actif et pré-remplit la durée.
  useEffect(() => {
    if (!open || editAppointment) return;
    if (services.length === 0) return;
    if (selectedServiceId === "") {
      setSelectedServiceId(services[0].id);
      setValue("duration", services[0].durationMin as AppointmentFormValues["duration"]);
      return;
    }
    // Story 8.5 : si un soin a été pré-rempli (conversion liste d'attente), aligne
    // la durée sur ce soin une seule fois (sans écraser une édition manuelle).
    if (!prefillDurationApplied.current) {
      const svc = services.find((s) => s.id === selectedServiceId);
      if (svc) {
        setValue("duration", svc.durationMin as AppointmentFormValues["duration"]);
      }
      prefillDurationApplied.current = true;
    }
  }, [open, editAppointment, services, selectedServiceId, setValue]);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  // Option legacy / repli : RDV existant dont le service n'est pas (ou plus)
  // dans la liste, ou création sans aucun service configuré.
  const showFallbackOption = !services.some((s) => s.id === selectedServiceId);
  const fallbackLabel = editAppointment?.type
    ? `${editAppointment.type} (actuel)`
    : "Consultation";
  const dotColor = getServiceColor(selectedService?.color).dot;

  const handleServiceChange = (id: string) => {
    setSelectedServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setValue("duration", svc.durationMin as AppointmentFormValues["duration"], {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = useCallback(
    async (values: AppointmentFormValues) => {
      const svc = services.find((s) => s.id === selectedServiceId);
      const payload: AppointmentFormValues = {
        ...values,
        serviceTypeId: svc ? svc.id : undefined,
        type: svc ? svc.label : (editAppointment?.type ?? "Consultation"),
      };

      // Story 8.4 : récurrence active (création uniquement) → série de RDV.
      if (!isEdit && recurring) {
        // Valeur clampée [2,26] — alignée sur l'aperçu (jamais de mismatch avec
        // le serveur qui re-valide via recurrenceSchema).
        const result = await createRecurringAppointments(payload, {
          frequency,
          occurrences: effectiveOccurrences,
        });
        if (result.success) {
          // Détail chiffré composé ici depuis le résumé (pas de clé toast par valeur).
          const base = TOAST_MESSAGES.appointment.seriesCreated;
          showSuccess(
            result.skipped > 0
              ? `${base} ${result.created} créé${result.created > 1 ? "s" : ""}, ${result.skipped} ignoré${result.skipped > 1 ? "s" : ""} (créneaux occupés).`
              : `${base} ${result.created} rendez-vous programmé${result.created > 1 ? "s" : ""}.`,
          );
          clearCache();
          onOpenChange(false);
          onSuccess?.();
        } else {
          showError(
            result.slotTaken
              ? TOAST_MESSAGES.errors.slotTaken
              : TOAST_MESSAGES.errors.server,
          );
        }
        return;
      }

      const action =
        isEdit && editAppointment
          ? () => updateAppointment(editAppointment.id, payload)
          : () => createAppointment(payload);

      const result = await action();

      if (result.success) {
        showSuccess(
          isEdit
            ? TOAST_MESSAGES.appointment.updated
            : TOAST_MESSAGES.appointment.created,
        );
        clearCache();
        onOpenChange(false);
        // Story 8.5 : transmet le RDV créé/modifié pour l'orchestration post-succès
        // (conversion d'une entrée de liste d'attente en RDV).
        onSuccess?.(result.appointment);
      } else {
        showError(
          result.slotTaken
            ? TOAST_MESSAGES.errors.slotTaken
            : TOAST_MESSAGES.errors.server,
        );
      }
    },
    [
      services,
      selectedServiceId,
      clearCache,
      isEdit,
      editAppointment,
      onOpenChange,
      onSuccess,
      recurring,
      frequency,
      effectiveOccurrences,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[520px] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "Mettez à jour l'horaire, le type de soin ou les notes."
              : "Programme d'une consultation"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-6 pb-2 max-h-[70vh] overflow-y-auto"
        >
          {/* ───────────────────── Patient ───────────────────── */}
          <Controller
            control={control}
            name="patientId"
            render={({ field }) => (
              <div className="space-y-2">
                <SectionLabel required>Patient</SectionLabel>
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

          {/* ───────────────── Date & créneau ───────────────── */}
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => {
              const date = field.value instanceof Date ? field.value : new Date();
              return (
                <div className="space-y-2">
                  <SectionLabel required>Date & créneau</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePickerCard
                      value={date}
                      onChange={(newDate) => field.onChange(newDate)}
                      hasError={!!errors.startTime}
                    />
                    <TimePickerCard
                      value={date}
                      endTime={endTime}
                      onChange={(newDate) => field.onChange(newDate)}
                      hasError={!!errors.startTime}
                    />
                  </div>
                  {errors.startTime?.message && (
                    <p
                      className="text-xs text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200"
                      role="alert"
                    >
                      {errors.startTime.message}
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* ─────────────── Type de soin (story 7.3) ───────────────
              Liste dynamique des services actifs ; pastille de couleur du
              service sélectionné ; le choix pré-remplit la durée. */}
          <div className="space-y-2">
            <SectionLabel htmlFor="serviceType">Type de soin</SectionLabel>
            <div className="relative">
              <span
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full transition-colors duration-200",
                  dotColor,
                )}
                aria-hidden
              />
              <select
                id="serviceType"
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                disabled={servicesLoading}
                className={cn(
                  "h-11 w-full appearance-none rounded-lg border bg-background pl-8 pr-9 text-sm shadow-xs transition-colors border-input",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {(showFallbackOption || services.length === 0) && (
                  <option value="">{fallbackLabel}</option>
                )}
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {shortDuration(s.durationMin)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
            </div>
            {!servicesLoading && services.length === 0 && !isEdit && (
              <p className="text-xs text-muted-foreground">
                Aucun type de soin configuré. La consultation par défaut est
                utilisée — ajoutez vos types dans Paramètres → Types de soins.
              </p>
            )}
          </div>

          {/* ─────────────────────── Durée ─────────────────────── */}
          <Controller
            control={control}
            name="duration"
            render={({ field }) => (
              <div className="space-y-2">
                <SectionLabel
                  right={
                    selectedService ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Soin : {shortDuration(selectedService.durationMin)}
                      </span>
                    ) : undefined
                  }
                >
                  Durée
                </SectionLabel>
                <div
                  role="radiogroup"
                  aria-label="Durée du rendez-vous"
                  className="relative grid grid-cols-5 gap-1 rounded-full bg-muted/60 p-1"
                >
                  {APPOINTMENT_DURATIONS.map((d) => {
                    const active = field.value === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => field.onChange(d)}
                        className={cn(
                          "relative z-10 flex h-9 items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-emerald-100 text-emerald-900 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-100"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                        )}
                      >
                        {DURATION_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
                {errors.duration?.message && (
                  <p className="text-xs text-rose-500" role="alert">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            )}
          />

          {/* ────────────────── Notes internes ────────────────── */}
          <div className="space-y-2">
            <SectionLabel
              htmlFor="notes"
              right={
                <span
                  className={cn(
                    "text-[11px] tabular-nums transition-colors",
                    watchedNotes.length > 450
                      ? "text-rose-500"
                      : "text-muted-foreground",
                  )}
                >
                  {watchedNotes.length} / 500
                </span>
              }
            >
              Notes internes
            </SectionLabel>
            <Textarea
              id="notes"
              placeholder="Motif, symptômes, contexte particulier… (visible uniquement par vous)"
              maxLength={500}
              rows={3}
              className={cn(
                "resize-none rounded-lg text-sm transition-colors focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500",
                errors.notes && "border-rose-500 focus-visible:ring-rose-500/40",
              )}
              {...register("notes")}
            />
            {errors.notes?.message && (
              <p className="text-xs text-rose-500" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* ──────────────── Récurrence (story 8.4) ────────────────
              Section affichée uniquement en création. Désactivée par défaut →
              comportement unitaire 3.3 inchangé. */}
          {!isEdit && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label
                    htmlFor="recurring"
                    className="text-sm font-medium leading-none"
                  >
                    Rendez-vous récurrent
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Créer toute une série en une fois (même patient, même créneau).
                  </p>
                </div>
                <Switch
                  id="recurring"
                  checked={recurring}
                  onCheckedChange={setRecurring}
                  aria-label="Activer la récurrence"
                />
              </div>

              {recurring && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Fréquence */}
                    <div className="space-y-1.5">
                      <SectionLabel htmlFor="frequency">Fréquence</SectionLabel>
                      <select
                        id="frequency"
                        value={frequency}
                        onChange={(e) =>
                          setFrequency(e.target.value as RecurrenceFrequency)
                        }
                        className={cn(
                          "h-10 w-full appearance-none rounded-lg border bg-background px-3 text-sm shadow-xs transition-colors border-input",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500",
                        )}
                      >
                        {(
                          Object.keys(FREQUENCY_LABELS) as RecurrenceFrequency[]
                        ).map((f) => (
                          <option key={f} value={f}>
                            {FREQUENCY_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nombre d'occurrences */}
                    <div className="space-y-1.5">
                      <SectionLabel htmlFor="occurrences">
                        Nombre de RDV
                      </SectionLabel>
                      <input
                        id="occurrences"
                        type="number"
                        min={RECURRENCE_MIN_OCCURRENCES}
                        max={RECURRENCE_MAX_OCCURRENCES}
                        value={Number.isFinite(occurrences) ? occurrences : ""}
                        aria-invalid={occurrencesOutOfRange}
                        // On stocke la saisie brute (même hors bornes) pour une
                        // validation inline ; on reclampe à la perte de focus.
                        onChange={(e) =>
                          setOccurrences(
                            e.target.value === "" ? NaN : Number(e.target.value),
                          )
                        }
                        onBlur={() => setOccurrences(effectiveOccurrences)}
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs transition-colors border-input tabular-nums",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500",
                          occurrencesOutOfRange &&
                            "border-rose-500 focus-visible:ring-rose-500/40",
                        )}
                      />
                      {occurrencesOutOfRange && (
                        <p className="text-[11px] text-rose-500" role="alert">
                          Entre {RECURRENCE_MIN_OCCURRENCES} et{" "}
                          {RECURRENCE_MAX_OCCURRENCES} rendez-vous (ajusté à{" "}
                          {effectiveOccurrences}).
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Aperçu des dates générées */}
                  {recurrenceDates.length > 0 && (
                    <div className="space-y-1">
                      <SectionLabel>
                        Aperçu ({recurrenceDates.length} dates)
                      </SectionLabel>
                      <ul
                        className="flex flex-wrap gap-1.5 text-xs"
                        aria-label="Dates de la série"
                      >
                        {recurrenceDates.map((d, i) => (
                          <li
                            key={i}
                            className="rounded-md bg-background px-2 py-1 text-muted-foreground tabular-nums shadow-xs"
                          >
                            {format(d, "EEE d MMM HH:mm", { locale: fr })}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-muted-foreground">
                        Les créneaux déjà occupés seront automatiquement ignorés.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground"
          >
            Annuler
          </Button>
          <LoadingButton
            type="submit"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            loadingText={isEdit ? "Enregistrement…" : "Création…"}
            className={cn(
              "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
              "transition-all duration-200 hover:shadow-md",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isEdit ? "Enregistrer" : "Créer le rendez-vous"}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants : pickers date/heure stylés
// ─────────────────────────────────────────────────────────────────────────────

function DatePickerCard({
  value,
  onChange,
  hasError,
}: {
  value: Date;
  onChange: (d: Date) => void;
  hasError: boolean;
}) {
  const label = format(value, "EEE d MMM yyyy", { locale: fr });

  return (
    <label
      className={cn(
        "relative flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm shadow-xs transition-all duration-200",
        "hover:border-emerald-500/60 hover:shadow-sm",
        "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/40",
        hasError && "border-rose-500",
      )}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 truncate font-medium">{label}</span>
      <input
        type="date"
        value={toDateInputString(value)}
        onChange={(e) => {
          const merged = mergeDateAndTime(
            e.target.value,
            toTimeInputString(value),
            value,
          );
          onChange(merged);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Choisir la date"
      />
    </label>
  );
}

function TimePickerCard({
  value,
  endTime,
  onChange,
  hasError,
}: {
  value: Date;
  endTime: Date | null;
  onChange: (d: Date) => void;
  hasError: boolean;
}) {
  const startLabel = format(value, "HH:mm");
  const endLabel = endTime ? format(endTime, "HH:mm") : "—";

  return (
    <label
      className={cn(
        "relative flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm shadow-xs transition-all duration-200",
        "hover:border-emerald-500/60 hover:shadow-sm",
        "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/40",
        hasError && "border-rose-500",
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium tabular-nums">{startLabel}</span>
      <span
        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
        aria-hidden
      >
        <span className="text-base leading-none">→</span>
        {endLabel}
      </span>
      <input
        type="time"
        value={toTimeInputString(value)}
        onChange={(e) => {
          const merged = mergeDateAndTime(
            toDateInputString(value),
            e.target.value,
            value,
          );
          onChange(merged);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Choisir l'heure de début"
      />
    </label>
  );
}
