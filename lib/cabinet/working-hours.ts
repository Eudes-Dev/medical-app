/**
 * Helpers purs de manipulation des horaires d'ouverture (story 7.1).
 *
 * Module **sans dépendance Prisma ni date-fns** — uniquement de l'arithmétique
 * sur des heures "HH:mm". Volontairement isolé pour être testable et réutilisé
 * à la fois côté serveur (Zod, génération de créneaux) et côté client (éditeur).
 *
 * @module lib/cabinet/working-hours
 */

/**
 * Une plage horaire travaillée dans une journée.
 * `slotDuration` est exprimée en minutes (15 | 30 | 45 | 60).
 */
export interface WorkingHourRange {
  /** Heure de début "HH:mm" (24h). */
  startTime: string;
  /** Heure de fin "HH:mm" (24h, exclusive). */
  endTime: string;
  /** Durée d'un créneau en minutes. */
  slotDuration: number;
}

/**
 * Convertit une heure "HH:mm" en nombre de minutes depuis minuit.
 * @example toMinutes("08:30") // 510
 */
export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Convertit un nombre de minutes depuis minuit en heure "HH:mm".
 * @example fromMinutes(510) // "08:30"
 */
export const fromMinutes = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Indique si deux plages d'une **même journée** se chevauchent.
 *
 * Le chevauchement est strict : deux plages adjacentes (ex. 08:00–12:00 et
 * 12:00–18:00) ne se chevauchent **pas**.
 */
export const rangesOverlap = (a: WorkingHourRange, b: WorkingHourRange): boolean =>
  toMinutes(a.startTime) < toMinutes(b.endTime) &&
  toMinutes(b.startTime) < toMinutes(a.endTime);
