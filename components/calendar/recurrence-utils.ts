/**
 * Helpers purs de récurrence des rendez-vous (Story 8.4).
 *
 * Fonctions déterministes, **sans accès base ni DOM** : l'expansion des dates
 * d'une série est testable en isolation (cf. `month-utils` story 8.3).
 *
 * Convention fuseau (REL-001 / Dev Notes 8.4) : on raisonne en **heure locale**
 * du navigateur. `addWeeks`/`addMonths` (date-fns) préservent l'heure de paroi
 * (wall-clock) à travers les changements d'heure (DST) et ajustent les fins de
 * mois — comportement voulu (« tous les mardis 9h » reste à 9h locales). On
 * n'importe **aucun** helper Paris (`zonedDayBoundsUtc`/`formatSlotParis`…),
 * réservés au tunnel public.
 *
 * @module components/calendar/recurrence-utils
 */

import { addWeeks, addMonths } from "date-fns";

/**
 * Fréquences de récurrence supportées (story 8.4).
 * - `weekly` : toutes les semaines.
 * - `biweekly` : toutes les 2 semaines.
 * - `monthly` : même quantième de mois (géré par date-fns pour les fins de mois).
 */
export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

/**
 * Génère les dates d'occurrence d'une série récurrente.
 *
 * Helper **pur** : aucune date n'est filtrée ici (l'anti-collision se fait dans
 * la Server Action, par créneau). Renvoie exactement `occurrences` dates, la 1ʳᵉ
 * étant `start` lui-même (`i = 0`).
 *
 * @param start - Date/heure de la 1ʳᵉ occurrence (heure locale).
 * @param frequency - Fréquence de répétition.
 * @param occurrences - Nombre total de RDV de la série (1ʳᵉ incluse).
 * @returns Tableau de `occurrences` dates, espacées selon la fréquence.
 */
export function buildRecurrenceDates(
  start: Date,
  frequency: RecurrenceFrequency,
  occurrences: number,
): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < occurrences; i++) {
    switch (frequency) {
      case "weekly":
        dates.push(addWeeks(start, i));
        break;
      case "biweekly":
        dates.push(addWeeks(start, 2 * i));
        break;
      case "monthly":
        dates.push(addMonths(start, i));
        break;
    }
  }
  return dates;
}
