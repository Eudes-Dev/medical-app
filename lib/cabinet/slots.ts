/**
 * Logique de génération et de filtrage des créneaux de rendez-vous.
 *
 * Extraite dans son propre module pour être testable indépendamment
 * de la Server Action et de Prisma.
 *
 * @module lib/cabinet/slots
 */

import { addMinutes } from "date-fns";
import { CABINET_INFO, type OpeningHours } from "@/lib/cabinet/config";

/** Intervalle d'un rendez-vous existant utilisé pour le filtrage. */
export interface AppointmentInterval {
  startTime: Date;
  endTime: Date;
}

/**
 * Génère tous les créneaux possibles d'une journée selon les horaires
 * d'ouverture du cabinet. La date passée détermine le jour ; les heures
 * sont écrasées par `openingHours.start` / `end`.
 */
export function generateSlots(
  date: Date,
  openingHours: OpeningHours = CABINET_INFO.openingHours,
): Date[] {
  const { start, end, slotMinutes } = openingHours;
  const slots: Date[] = [];
  for (let hour = start; hour < end; hour++) {
    for (let min = 0; min < 60; min += slotMinutes) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, min, 0, 0);
      slots.push(slotTime);
    }
  }
  return slots;
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
 */
export function filterAvailableSlots(
  date: Date,
  appointments: AppointmentInterval[],
  openingHours: OpeningHours = CABINET_INFO.openingHours,
): Date[] {
  const slots = generateSlots(date, openingHours);
  const { slotMinutes } = openingHours;
  return slots.filter(
    (slot) => !appointments.some((apt) => isOverlapping(slot, slotMinutes, apt)),
  );
}
