"use client";

/**
 * Modal de création / édition d'un rendez-vous (Story 3.3).
 *
 * Refonte UI (v2) inspirée de la maquette de référence :
 * - Sections visuelles claires (PATIENT / DATE & CRÉNEAU / DURÉE / TYPE / NOTES)
 *   avec libellés en small-caps tracking-wider façon "form pro".
 * - Pickers date + heure en cartes côte à côte, avec aperçu de l'heure de fin
 *   calculée à partir de la durée sélectionnée.
 * - Sélecteur de durée en "pill segmented control" (15m / 30m / 45m / 1h) avec
 *   badge "Recommandé" sur la valeur conseillée.
 * - Type de consultation : select stylé avec une pastille de couleur (palette
 *   cohérente avec les statuts du calendrier).
 * - Compteur de caractères dynamique sur les notes.
 * - Animations fluides : entrée du dialog (zoom/fade fournis par Radix), fade
 *   des messages d'erreur, transitions sur les contrôles (pill, hover...).
 *
 * Logique métier (validation Zod, server actions, conflits) inchangée.
 *
 * @module components/calendar/CreateAppointmentModal
 */

import * as React from "react";
import { useCallback, useEffect, useMemo } from "react";
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
  APPOINTMENT_TYPES,
  type AppointmentFormValues,
} from "@/lib/validations/appointment";
import {
  createAppointment,
  updateAppointment,
} from "@/app/dashboard/calendar/actions";
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
  /** Appelé après création / modification réussie */
  onSuccess?: () => void;
}

/**
 * Durée "recommandée" par défaut (alignée sur le créneau de la grille = 30 min).
 * Affichée comme badge "Recommandé" pour guider l'utilisateur.
 */
const RECOMMENDED_DURATION = 30;

/** Libellé compact des durées pour le pill segmented control. */
const DURATION_LABELS: Record<number, string> = {
  15: "15m",
  30: "30m",
  45: "45m",
  60: "1h",
};

/**
 * Palette de pastilles par type de consultation.
 * On reprend les couleurs du calendrier pour rester cohérent visuellement.
 */
const TYPE_COLORS: Record<(typeof APPOINTMENT_TYPES)[number], string> = {
  "Première consultation": "bg-emerald-500",
  Suivi: "bg-blue-500",
  Urgence: "bg-rose-500",
};

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
function mergeDateAndTime(
  dateStr: string,
  timeStr: string,
  prev: Date,
): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return prev;
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composant : libellé "small caps" façon maquette
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Libellé de section dans le formulaire — uppercase + tracking pour lisibilité.
 * Accepte `required` pour afficher l'astérisque rouge.
 */
function SectionLabel({
  htmlFor,
  required,
  children,
  right,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  /** Contenu à droite du libellé (ex: badge "Recommandé", compteur de caractères) */
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
  onSuccess,
}: CreateAppointmentModalProps) {
  const clearCache = useCalendarStore((s) => s.clearCache);
  const isEdit = Boolean(editAppointment);

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
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: editAppointment?.patientId ?? "",
      startTime: editAppointment?.startTime ?? defaultStartTime ?? new Date(),
      duration: initialDuration,
      type:
        (editAppointment?.type as AppointmentFormValues["type"]) ??
        "Première consultation",
      notes: editAppointment?.notes ?? "",
    },
  });

  // Valeurs observées pour afficher en direct l'heure de fin et le compteur de notes.
  const watchedStart = watch("startTime");
  const watchedDuration = watch("duration");
  const watchedNotes = watch("notes") ?? "";
  const watchedType = watch("type");

  /**
   * Heure de fin = startTime + duration. Recalculée à la volée pour l'aperçu
   * affiché à droite du time picker (ex: "10:00 → 10:30").
   */
  const endTime = useMemo(() => {
    if (!(watchedStart instanceof Date)) return null;
    return new Date(watchedStart.getTime() + watchedDuration * 60_000);
  }, [watchedStart, watchedDuration]);

  // Réinitialisation à l'ouverture (création) / passage en édition.
  useEffect(() => {
    if (!open) return;
    if (editAppointment) {
      reset({
        patientId: editAppointment.patientId,
        startTime: editAppointment.startTime,
        duration: initialDuration,
        type: editAppointment.type as AppointmentFormValues["type"],
        notes: editAppointment.notes ?? "",
      });
    } else {
      reset({
        patientId: "",
        startTime: defaultStartTime ?? new Date(),
        duration: RECOMMENDED_DURATION,
        type: "Première consultation",
        notes: "",
      });
    }
  }, [open, defaultStartTime, editAppointment, initialDuration, reset]);

  /**
   * Soumission : dispatch vers createAppointment ou updateAppointment selon le mode.
   * Affiche un toast (succès / erreur), purge le cache du store calendrier puis ferme.
   */
  const onSubmit = useCallback(
    async (values: AppointmentFormValues) => {
      const action = isEdit && editAppointment
        ? () => updateAppointment(editAppointment.id, values)
        : () => createAppointment(values);

      const result = await action();

      if (result.success) {
        showSuccess(
          isEdit
            ? TOAST_MESSAGES.appointment.updated
            : TOAST_MESSAGES.appointment.created,
        );
        clearCache();
        onOpenChange(false);
        onSuccess?.();
      } else {
        // AC 6/16 : message générique, aucun détail interne dans l'UI.
        showError(
          result.error?.includes("occupé")
            ? TOAST_MESSAGES.errors.slotTaken
            : TOAST_MESSAGES.errors.server,
        );
      }
    },
    [clearCache, isEdit, editAppointment, onOpenChange, onSuccess],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        DialogContent fournit déjà une animation d'entrée (fade + zoom 95%).
        On élargit légèrement (sm:max-w-lg → 520px) et on retire le gap par
        défaut pour piloter nous-mêmes l'espacement entre sections.
      */}
      <DialogContent className="gap-0 p-0 sm:max-w-[520px] overflow-hidden">
        {/* En-tête : titre + sous-titre */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {isEdit ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "Mettez à jour l'horaire, le type ou les notes."
              : "Programme d'une consultation"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-6 pb-2 max-h-[70vh] overflow-y-auto"
        >
          {/* ───────────────────── Patient ─────────────────────
              On délègue à PatientSelect (recherche + création) ;
              on lui passe simplement notre libellé small-caps. */}
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

          {/* ───────────────── Date & créneau ─────────────────
              Deux cartes côte à côte :
              - une pour la date (avec icône calendrier)
              - une pour l'heure (avec icône horloge + aperçu de l'heure de fin)
              Chaque carte enveloppe un input natif (HTML5) caché derrière une
              UI custom : on conserve l'accessibilité native (clavier, picker
              système) tout en obtenant un visuel premium.
          */}
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => {
              const date = field.value instanceof Date ? field.value : new Date();
              return (
                <div className="space-y-2">
                  <SectionLabel required>Date & créneau</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Carte date */}
                    <DatePickerCard
                      value={date}
                      onChange={(newDate) => field.onChange(newDate)}
                      hasError={!!errors.startTime}
                    />
                    {/* Carte heure (avec aperçu de l'heure de fin) */}
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

          {/* ─────────────────────── Durée ───────────────────────
              Pill segmented control : chaque durée est un bouton, le choix
              actif est mis en évidence par un fond emerald + ombre. On utilise
              setValue (RHF) plutôt qu'un select natif pour le contrôle fin.
          */}
          <Controller
            control={control}
            name="duration"
            render={({ field }) => (
              <div className="space-y-2">
                <SectionLabel
                  right={
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Recommandé : {RECOMMENDED_DURATION}m
                    </span>
                  }
                >
                  Durée
                </SectionLabel>
                <div
                  role="radiogroup"
                  aria-label="Durée du rendez-vous"
                  className="relative grid grid-cols-4 gap-1 rounded-full bg-muted/60 p-1"
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
                          // Base : pilule pleine largeur, transitions sur fond/ombre/couleur
                          "relative z-10 flex h-9 items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
                          active
                            // État actif : carte emerald avec lift visuel
                            ? "bg-emerald-100 text-emerald-900 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-100"
                            // État inactif : texte estompé, fond au hover
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

          {/* ─────────────── Type de consultation ───────────────
              Select natif (accessible) auquel on superpose une pastille de
              couleur correspondant au type sélectionné. L'icône ChevronDown
              custom remplace le caret par défaut (appearance-none).
          */}
          <div className="space-y-2">
            <SectionLabel htmlFor="type">Type de consultation</SectionLabel>
            <div className="relative">
              {/* Pastille de couleur à gauche, suit le type sélectionné */}
              <span
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full transition-colors duration-200",
                  TYPE_COLORS[watchedType] ?? "bg-slate-400",
                )}
                aria-hidden
              />
              <select
                id="type"
                {...register("type")}
                className={cn(
                  // Padding-left pour laisser la place à la pastille ; padding-right pour le chevron
                  "h-11 w-full appearance-none rounded-lg border bg-background pl-8 pr-9 text-sm shadow-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500",
                  errors.type
                    ? "border-rose-500 focus-visible:ring-rose-500/40"
                    : "border-input",
                )}
                aria-invalid={!!errors.type}
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
            </div>
            {errors.type?.message && (
              <p className="text-xs text-rose-500" role="alert">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* ────────────────── Notes internes ──────────────────
              Textarea + compteur de caractères dynamique aligné à droite
              du libellé. Le compteur passe en rouge à l'approche de la limite.
          */}
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
        </form>

        {/* Footer collant en bas : séparé par une bordure, fond muted léger. */}
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
              // Bouton principal vert (cohérent avec la maquette + statut CONFIRMED)
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

/**
 * Carte affichant la date au format "lun. 18 mai 2026" et superposant un
 * <input type="date"> transparent qui ouvre le picker natif au clic.
 * Conserve l'a11y (tab, espace, picker système, lecteurs d'écran).
 */
function DatePickerCard({
  value,
  onChange,
  hasError,
}: {
  value: Date;
  onChange: (d: Date) => void;
  hasError: boolean;
}) {
  // Format français court : "lun. 18 mai 2026"
  const label = format(value, "EEE d MMM yyyy", { locale: fr });

  return (
    <label
      className={cn(
        // Carte cliquable : padding confortable, hover/focus états
        "relative flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm shadow-xs transition-all duration-200",
        "hover:border-emerald-500/60 hover:shadow-sm",
        "focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/40",
        hasError && "border-rose-500",
      )}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex-1 truncate font-medium">{label}</span>
      {/* Input natif transparent par-dessus : récupère les clics et le clavier */}
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

/**
 * Carte affichant l'heure de début + flèche vers l'heure de fin calculée.
 * Même principe que DatePickerCard : input natif transparent superposé.
 */
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
      {/* Flèche + heure de fin (en muted, ne se sélectionne pas) */}
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
