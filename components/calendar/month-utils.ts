/**
 * Utilitaires purs de la vue **mois** de l'agenda (Story 8.3).
 *
 * - `buildMonthMatrix` : construit la matrice calendaire (semaines complètes,
 *   lundi → dimanche) couvrant le mois d'une date pivot, avec un drapeau
 *   `inCurrentMonth` pour atténuer les débordements de semaine.
 * - `getMonthFetchRange` : plage `[startDate, endDate]` (lundi 8h → dimanche 20h)
 *   couvrant **toutes les cellules visibles**, à passer aux Server Actions de
 *   fetch (`getAppointmentsByDateRange` / `getTimeOffsByDateRange`).
 *
 * Aucune dépendance DOM ni store : module isolé, testable indépendamment.
 * Raisonnement en **heure locale du navigateur** (convention du dashboard) —
 * ne PAS introduire les helpers Paris (REL-001) réservés au tunnel public.
 *
 * @module components/calendar/month-utils
 */

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  setHours,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { GRID_START_HOUR, GRID_END_HOUR } from "./calendar-utils";

/** Semaine ISO : lundi = début de semaine (cohérent avec la vue semaine). */
const WEEK_STARTS_ON = 1;

/** Une cellule de la matrice mensuelle : un jour + son appartenance au mois pivot. */
export interface MonthCell {
  /** Date du jour (à minuit, heure locale). */
  date: Date;
  /** `true` si le jour appartient au mois de la date pivot ; `false` pour les
   * débordements de semaine (jours du mois précédent/suivant). */
  inCurrentMonth: boolean;
}

/**
 * Construit la matrice calendaire du mois de `pivot` : du **lundi de la semaine
 * du 1er** au **dimanche de la semaine du dernier jour** du mois. Le résultat
 * couvre des semaines complètes (longueur multiple de 7, typiquement 35 ou 42).
 *
 * @param pivot - N'importe quelle date du mois à afficher.
 * @returns La liste ordonnée des jours visibles, chacun avec `inCurrentMonth`.
 */
export function buildMonthMatrix(pivot: Date): MonthCell[] {
  const gridStart = startOfWeek(startOfMonth(pivot), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const gridEnd = endOfWeek(endOfMonth(pivot), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date,
    inCurrentMonth: isSameMonth(date, pivot),
  }));
}

/**
 * Calcule la plage de fetch couvrant **toutes les cellules visibles** de la vue
 * mois : du lundi de la 1ʳᵉ semaine à `GRID_START_HOUR` (8h) au dimanche de la
 * dernière semaine à `GRID_END_HOUR` (20h).
 *
 * @param pivot - N'importe quelle date du mois à afficher.
 * @returns `{ startDate, endDate }` à passer à `getAppointmentsByDateRange`.
 */
export function getMonthFetchRange(pivot: Date): {
  startDate: Date;
  endDate: Date;
} {
  const gridStart = startOfWeek(startOfMonth(pivot), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  const gridEnd = endOfWeek(endOfMonth(pivot), {
    weekStartsOn: WEEK_STARTS_ON,
  });
  return {
    startDate: setHours(startOfDay(gridStart), GRID_START_HOUR),
    endDate: setHours(startOfDay(gridEnd), GRID_END_HOUR),
  };
}
