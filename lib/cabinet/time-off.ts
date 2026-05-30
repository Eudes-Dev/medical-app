/**
 * Helpers purs de composition des exceptions `TimeOff` avec les créneaux
 * (story 7.2). Aucune dépendance Prisma / date-fns — uniquement de
 * l'arithmétique sur des dates calendaires et des "HH:mm".
 *
 * Module isolé pour rester testable indépendamment et réutilisable côté serveur
 * (générateur, Server Actions) comme côté client (visualisation calendrier).
 *
 * @module lib/cabinet/time-off
 */

import { toMinutes } from "@/lib/cabinet/working-hours";
import { zonedDayKey, zonedMinutes } from "@/lib/cabinet/timezone";

/** Un intervalle d'exception sérialisable (forme attendue par le générateur). */
export interface TimeOffInterval {
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
}

/**
 * Clé calendaire `YYYYMMDD` (entier) du **jour de Paris** — comparaison jour à
 * jour indépendante du fuseau serveur (story 5.3, REL-001). Délègue à
 * {@link zonedDayKey} pour fixer la source unique de TZ (`Europe/Paris`).
 */
export const dayKey = (d: Date): number => zonedDayKey(d);

export const isSameOrAfterDay = (a: Date, b: Date): boolean => dayKey(a) >= dayKey(b);
export const isSameOrBeforeDay = (a: Date, b: Date): boolean => dayKey(a) <= dayKey(b);

/**
 * `true` si `date` est entièrement bloquée par une exception `allDay` (bornes
 * inclusives). Une exception partielle (non-allDay) ne bloque jamais un jour
 * entier, même si elle est sur le même jour.
 */
export function isDayFullyBlocked(date: Date, offs: TimeOffInterval[]): boolean {
  const k = dayKey(date);
  return offs.some(
    (o) => o.allDay && dayKey(o.startDate) <= k && k <= dayKey(o.endDate),
  );
}

/**
 * `true` si le créneau `[slot, slot+slotMinutes)` chevauche une exception
 * **partielle** (intra-journée) du **même jour** que `slot`.
 *
 * Adjacence non bloquante : un créneau 12:00–12:30 et une exception 12:30–14:00
 * ne se chevauchent pas (strict `<` / `>`, comme `isOverlapping`/`rangesOverlap`).
 */
export function slotInPartialTimeOff(
  slot: Date,
  slotMinutes: number,
  offs: TimeOffInterval[],
): boolean {
  // Heure murale du créneau en `Europe/Paris` (story 5.3) — cohérente avec les
  // bornes `o.startTime`/`o.endTime` qui sont des "HH:mm" heure de Paris.
  const slotStart = zonedMinutes(slot);
  const slotEnd = slotStart + slotMinutes;
  const slotKey = dayKey(slot);
  return offs.some((o) => {
    if (o.allDay || !o.startTime || !o.endTime) return false;
    if (dayKey(o.startDate) !== slotKey) return false;
    const offStart = toMinutes(o.startTime);
    const offEnd = toMinutes(o.endTime);
    return slotStart < offEnd && slotEnd > offStart;
  });
}
