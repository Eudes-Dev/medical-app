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

export type { WorkingHourRange } from "@/lib/cabinet/working-hours";

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
 * plages horaires. La date passée détermine le **jour** ; les heures de chaque
 * créneau sont posées via `setHours` (cf. note Fuseau horaire dans la story 7.1).
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
      const start = new Date(date);
      // NB: setHours s'appuie sur le fuseau local du serveur — héritage TZ
      // 4.1/4.2 (REL-001), corrigé de façon transverse avant mise en prod.
      start.setHours(Math.floor(m / 60), m % 60, 0, 0);
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
 * Filtre les créneaux d'une journée pour ne conserver que ceux qui ne
 * chevauchent aucun rendez-vous existant.
 *
 * Point d'extension de la story 7.2 : les exceptions `TimeOff` (congés/fériés)
 * viendront retrancher des créneaux par-dessus la sortie de `generateDaySlots`.
 */
export function filterAvailableSlots(
  date: Date,
  appointments: AppointmentInterval[],
  ranges: WorkingHourRange[],
): GeneratedSlot[] {
  return generateDaySlots(date, ranges).filter(
    (s) => !appointments.some((apt) => isOverlapping(s.start, s.slotMinutes, apt)),
  );
}
