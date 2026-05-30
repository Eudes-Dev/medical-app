/**
 * Logique de génération et de filtrage des créneaux de rendez-vous.
 *
 * Extraite dans son propre module pour être testable indépendamment
 * de la Server Action et de Prisma.
 *
 * Depuis la story 7.1, la génération s'appuie sur les **plages horaires**
 * (`WorkingHourRange`) lues en base (`WorkingHours`) et non plus sur la
 * constante figée `CABINET_INFO.openingHours`. Chaque plage porte sa propre
 * `slotDuration`, ce qui permet une granularité différente matin / après-midi.
 *
 * @module lib/cabinet/slots
 */

import { addMinutes } from "date-fns";
import { toMinutes, type WorkingHourRange } from "@/lib/cabinet/working-hours";
import { slotInstant } from "@/lib/cabinet/timezone";
import {
  isDayFullyBlocked,
  slotInPartialTimeOff,
  type TimeOffInterval,
} from "@/lib/cabinet/time-off";

export type { WorkingHourRange } from "@/lib/cabinet/working-hours";
export type { TimeOffInterval } from "@/lib/cabinet/time-off";

/** Intervalle d'un rendez-vous existant utilisé pour le filtrage. */
export interface AppointmentInterval {
  startTime: Date;
  endTime: Date;
}

/** Un créneau généré : son instant de début et la durée (minutes) de la plage source. */
export interface GeneratedSlot {
  start: Date;
  slotMinutes: number;
}

/**
 * Génère tous les créneaux possibles d'une journée à partir d'une liste de
 * plages horaires. La date passée détermine le **jour** ; chaque créneau est
 * posé à son heure murale **`Europe/Paris`** via {@link slotInstant} (story 5.3,
 * REL-001), indépendamment du fuseau du serveur (CET/CEST gérés automatiquement).
 *
 * La condition `m + slotDuration <= endM` garantit qu'aucun créneau ne dépasse
 * la fin de la plage : une plage 08:00–18:00 / 30 min produit exactement 20
 * créneaux (le dernier 17:30→18:00). Une plage trop courte pour contenir un
 * seul créneau (amplitude < slotDuration) ne produit rien.
 *
 * Les créneaux retournés sont triés par ordre chronologique (utile lorsque
 * plusieurs plages se succèdent dans la journée).
 */
export function generateDaySlots(
  date: Date,
  ranges: WorkingHourRange[],
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  for (const r of ranges) {
    const startM = toMinutes(r.startTime);
    const endM = toMinutes(r.endTime);
    for (let m = startM; m + r.slotDuration <= endM; m += r.slotDuration) {
      // Instant UTC de l'heure murale `m` (minutes depuis minuit) en heure de
      // Paris pour le jour de `date` — corrige REL-001 (story 5.3).
      const start = slotInstant(date, m);
      slots.push({ start, slotMinutes: r.slotDuration });
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Indique si un créneau `[slot, slot+slotMinutes)` chevauche
 * l'intervalle `[apt.startTime, apt.endTime)` d'un rendez-vous existant.
 */
export function isOverlapping(
  slot: Date,
  slotMinutes: number,
  apt: AppointmentInterval,
): boolean {
  const slotEnd = addMinutes(slot, slotMinutes);
  return slot < apt.endTime && slotEnd > apt.startTime;
}

/**
 * Filtre les créneaux d'une journée en retirant ceux qui chevauchent un
 * rendez-vous existant ou une exception `TimeOff` active (story 7.2).
 *
 * Le paramètre `timeOffs` est **optionnel** (défaut `[]`) afin de préserver la
 * compatibilité avec les appels 7.1 à 3 arguments (AC 10, non-régression) :
 * - Une exception `allDay` couvrant `date` court-circuite à `[]`.
 * - Une exception partielle (intra-journée) retire les créneaux qui la
 *   chevauchent.
 */
export function filterAvailableSlots(
  date: Date,
  appointments: AppointmentInterval[],
  ranges: WorkingHourRange[],
  timeOffs: TimeOffInterval[] = [],
): GeneratedSlot[] {
  if (isDayFullyBlocked(date, timeOffs)) return [];
  return generateDaySlots(date, ranges).filter(
    (s) =>
      !appointments.some((apt) => isOverlapping(s.start, s.slotMinutes, apt)) &&
      !slotInPartialTimeOff(s.start, s.slotMinutes, timeOffs),
  );
}
