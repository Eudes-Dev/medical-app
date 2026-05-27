/**
 * Modèle d'état client et validation de l'éditeur d'horaires (story 7.1).
 *
 * Partagé entre `schedule-editor` et `schedule-day-row`. La validation reprend
 * les mêmes règles que le schéma Zod serveur (`lib/validations/working-hours`)
 * pour un feedback inline cohérent avec la revalidation serveur.
 *
 * @module components/settings/schedule-model
 */

import { rangesOverlap, toMinutes } from "@/lib/cabinet/working-hours";
import { SLOT_DURATIONS } from "@/lib/validations/working-hours";
import type {
  DayScheduleDTO,
  RangeDTO,
} from "@/app/dashboard/settings/schedule/actions";

export { SLOT_DURATIONS };

/** Une plage dans l'état client (avec un id stable pour les clés React). */
export interface RangeState extends RangeDTO {
  id: string;
}

/** Le planning d'un jour dans l'état client. */
export interface DayState {
  dayOfWeek: number;
  ranges: RangeState[];
}

/** Ordre d'affichage Lundi→Dimanche (valeurs `Date.getDay()`). */
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Libellés FR des jours, indexés par `dayOfWeek` (0=Dimanche). */
export const DAY_LABELS: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

/** Plage par défaut ajoutée lorsqu'on ouvre un jour / ajoute une plage. */
const DEFAULT_RANGE: RangeDTO = {
  startTime: "08:00",
  endTime: "18:00",
  slotDuration: 30,
  active: true,
};

let newRangeCounter = 0;

/**
 * Crée une nouvelle plage côté client. Les ids des plages ajoutées par
 * l'utilisateur sont préfixés `new-` (générés uniquement lors d'événements
 * client) pour ne pas provoquer de mismatch d'hydratation.
 */
export function createRange(init: Partial<RangeDTO> = {}): RangeState {
  return { id: `new-${newRangeCounter++}`, ...DEFAULT_RANGE, ...init };
}

/**
 * Transforme le DTO serveur en état client avec des ids déterministes
 * (`${dayOfWeek}-${index}`) — stables entre SSR et hydratation.
 */
export function toWeekState(dto: DayScheduleDTO[]): DayState[] {
  return dto.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    ranges: day.ranges.map((r, i) => ({ ...r, id: `${day.dayOfWeek}-${i}` })),
  }));
}

/** Sérialise l'état (sans les ids) pour la détection de modifications. */
export function serializeWeek(week: DayState[]): string {
  return JSON.stringify(
    week.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      ranges: d.ranges.map(({ id: _id, ...r }) => r),
    })),
  );
}

/** Erreurs de validation d'un jour, par id de plage + chevauchement global. */
export interface DayErrors {
  /** Erreurs par id de plage : message sur `startTime` et/ou `endTime`. */
  ranges: Record<string, { startTime?: string; endTime?: string }>;
  /** Message de chevauchement (au niveau du jour). */
  overlap?: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Valide les plages d'un jour selon les mêmes règles que le schéma Zod serveur.
 * Le chevauchement est évalué sur **toutes** les plages (actives ou non), comme
 * côté serveur, pour éviter une sauvegarde rejetée.
 */
export function validateDay(day: DayState): DayErrors {
  const errors: DayErrors = { ranges: {} };

  for (const r of day.ranges) {
    const fieldErrors: { startTime?: string; endTime?: string } = {};
    if (!HHMM.test(r.startTime)) {
      fieldErrors.startTime = "Heure de début invalide.";
    }
    if (!HHMM.test(r.endTime)) {
      fieldErrors.endTime = "Heure de fin invalide.";
    } else if (HHMM.test(r.startTime)) {
      if (toMinutes(r.endTime) <= toMinutes(r.startTime)) {
        fieldErrors.endTime = "L'heure de fin doit être après l'heure de début.";
      } else if (toMinutes(r.endTime) - toMinutes(r.startTime) < r.slotDuration) {
        fieldErrors.endTime = "Plage trop courte pour un créneau.";
      }
    }
    if (fieldErrors.startTime || fieldErrors.endTime) {
      errors.ranges[r.id] = fieldErrors;
    }
  }

  const valid = day.ranges.filter(
    (r) => HHMM.test(r.startTime) && HHMM.test(r.endTime),
  );
  const overlaps = valid.some((a, i) =>
    valid.some((b, j) => i < j && rangesOverlap(a, b)),
  );
  if (overlaps) {
    errors.overlap = "Les plages de ce jour se chevauchent.";
  }

  return errors;
}

/** Indique si un jour comporte au moins une erreur. */
export function hasDayErrors(e: DayErrors): boolean {
  return Object.keys(e.ranges).length > 0 || e.overlap !== undefined;
}
