/**
 * Orchestration du déplacement optimiste d'un rendez-vous (Story 8.2, Task 4).
 *
 * Extrait de `page.tsx` pour être testable isolément (mock de la Server Action
 * et des toasts, faux store). La logique :
 * 1. **No-op** si le créneau cible == origine (AC 4) → aucun appel serveur.
 * 2. **Mise à jour optimiste** : la carte saute immédiatement au nouveau créneau
 *    via `setAppointments(cacheKey, nextList)` (durée conservée) (AC 6).
 * 3. **Persistance** via `updateAppointment(id, { startTime })` — action 3.3 qui
 *    revérifie les conflits et conserve la durée (AC 4, 5).
 * 4. **Succès** → toast « Rendez-vous déplacé. » + confirmation avec le RDV
 *    renvoyé par l'action (AC 6, 7).
 * 5. **Échec / exception** → restauration de l'état précédent + toast d'erreur
 *    (AC 5, 6).
 *
 * @module app/dashboard/calendar/move-appointment
 */

import type { Appointment, AppointmentWithPatient } from "@/types";
import { getSlotStartTime } from "@/components/calendar/CalendarGrid";
import { isSameSlot } from "@/components/calendar/drag-utils";
import { showError, showSuccess } from "@/lib/ui/toast";
import { TOAST_MESSAGES } from "@/lib/ui/toast-messages";
import { updateAppointment } from "@/app/dashboard/calendar/actions";

export interface MoveAppointmentParams {
  /** RDV déplacé (source de l'origine et de la durée à conserver). */
  appointment: AppointmentWithPatient;
  /** Jour de la colonne de dépôt. */
  day: Date;
  /** Index de créneau cible (0..23). */
  slotIndex: number;
  /** Clé de cache de la vue courante (`getCacheKeyForView`). */
  cacheKey: string;
  /** Lecture du cache (store). */
  getAppointments: (key: string) => Appointment[] | null;
  /** Écriture du cache (store). */
  setAppointments: (key: string, list: Appointment[]) => void;
}

/**
 * Déplace un RDV vers `day`/`slotIndex` de façon optimiste, en réutilisant la
 * Server Action `updateAppointment` (aucune nouvelle action serveur).
 */
export async function moveAppointment({
  appointment,
  day,
  slotIndex,
  cacheKey,
  getAppointments,
  setAppointments,
}: MoveAppointmentParams): Promise<void> {
  // AC 4 : dépôt sur le créneau d'origine → no-op (aucun appel, aucun toast).
  if (isSameSlot(appointment.startTime, day, slotIndex)) return;

  const newStart = getSlotStartTime(day, slotIndex);
  // Conserver la durée : endTime = newStart + (endTime − startTime) existant.
  const durationMs =
    appointment.endTime.getTime() - appointment.startTime.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  // Snapshot pour un éventuel revert (AC 5/6).
  const previousList = (getAppointments(cacheKey) ?? []) as AppointmentWithPatient[];
  const optimisticList = previousList.map((a) =>
    a.id === appointment.id
      ? { ...a, startTime: newStart, endTime: newEnd }
      : a,
  );
  setAppointments(cacheKey, optimisticList); // AC 6 : déplacement perçu instantané

  try {
    const result = await updateAppointment(appointment.id, {
      startTime: newStart,
    });
    if (result.success) {
      // Confirmer : remplacer le RDV optimiste par celui renvoyé par l'action,
      // en repartant de la liste courante (robuste à d'autres mutations).
      const current = (getAppointments(cacheKey) ?? []) as AppointmentWithPatient[];
      setAppointments(
        cacheKey,
        current.map((a) => (a.id === appointment.id ? result.appointment : a)),
      );
      showSuccess(TOAST_MESSAGES.appointment.moved);
    } else {
      // AC 5 : créneau occupé (ou autre échec métier) → revert + message renvoyé.
      setAppointments(cacheKey, previousList);
      showError(result.error || TOAST_MESSAGES.errors.server);
    }
  } catch {
    // AC 6 : exception réseau → restauration de l'état précédent + fallback.
    setAppointments(cacheKey, previousList);
    showError(TOAST_MESSAGES.errors.server);
  }
}
