/**
 * Politique de fenêtre de modification d'un rendez-vous patient (story 8.1).
 *
 * Un patient ne peut reprogrammer son rendez-vous que s'il débute à **plus de
 * {@link RESCHEDULE_MIN_NOTICE_HOURS} heures** de l'instant courant. En-deçà,
 * il doit contacter le cabinet (politique métier + anti-abus de dernière minute).
 *
 * La comparaison se fait sur l'**instant absolu** (`startTime` vs `now`), donc
 * insensible au fuseau horaire (aucun calcul d'heure murale). Module **sans
 * dépendance** (Prisma / date-fns), volontairement isolé pour être testable et
 * réutilisé côté route (affichage) ET côté Server Action (défense en profondeur).
 *
 * Co-localisation décidée avec le PO (2026-06-04) : ne PAS disperser la constante
 * dans `lib/cabinet/config.ts`.
 *
 * @module lib/booking/reschedule-policy
 */

/**
 * Délai minimum (en heures) avant le début du rendez-vous pour autoriser une
 * reprogrammation en self-service. Constante en dur pour le MVP (rendre ce seuil
 * configurable en base serait une story de paramétrage ultérieure).
 */
export const RESCHEDULE_MIN_NOTICE_HOURS = 24;

/** {@link RESCHEDULE_MIN_NOTICE_HOURS} exprimé en millisecondes. */
const MIN_NOTICE_MS = RESCHEDULE_MIN_NOTICE_HOURS * 60 * 60 * 1000;

/**
 * Indique si un rendez-vous débutant à `startTime` peut encore être géré
 * (annulé / reprogrammé) en self-service à l'instant `now`.
 *
 * `true` si et seulement si `startTime` est à **strictement plus** de
 * {@link RESCHEDULE_MIN_NOTICE_HOURS} heures dans le futur. Le bord exact
 * (`startTime - now === 24h`) est considéré **trop proche** (`false`).
 *
 * @param startTime Instant de début du rendez-vous.
 * @param now Instant courant (injectable pour les tests ; défaut = maintenant).
 */
export function canStillManage(startTime: Date, now: Date = new Date()): boolean {
  return startTime.getTime() - now.getTime() > MIN_NOTICE_MS;
}
