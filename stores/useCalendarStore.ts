/**
 * Store Zustand pour l'agenda / calendrier (Story 3.1).
 *
 * Gère :
 * - La date pivot (date actuellement affichée)
 * - Les filtres de vue (jour, semaine, mois, masquer annulés)
 * - Un cache local des rendez-vous pour des transitions fluides
 *
 * La persistance locale (localStorage) sauvegarde uniquement les préférences
 * (viewMode, showCancelled), pas la date pivot ni le cache.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  format,
  getWeek,
  startOfDay,
} from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appointment } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mode d'affichage du calendrier : jour, semaine ou mois */
export type ViewMode = "day" | "week" | "month";

/**
 * État et actions du store calendrier.
 * Les propriétés sont l'état réactif ; les méthodes sont les actions.
 */
export interface CalendarState {
  // ----- État (réactif) -----
  /** Date pivot : date autour de laquelle le calendrier est affiché */
  pivotDate: Date;
  /** Mode d'affichage actuel */
  viewMode: ViewMode;
  /** Si true, les RDV annulés sont visibles ; sinon masqués */
  showCancelled: boolean;
  /**
   * Cache des rendez-vous par clé.
   * Clés : 'YYYY-MM-DD' (jour), 'YYYY-Www' (semaine), 'YYYY-MM' (mois).
   */
  appointmentsCache: Record<string, Appointment[]>;

  // ----- Actions : navigation -----
  /** Avancer d'une unité selon viewMode (jour → +1 jour, semaine → +1 sem., mois → +1 mois) */
  goToNext: () => void;
  /** Reculer d'une unité selon viewMode */
  goToPrevious: () => void;
  /** Revenir à la date du jour */
  goToToday: () => void;
  /** Aller à une date précise (devient la nouvelle date pivot) */
  setDate: (date: Date) => void;

  // ----- Actions : filtres de vue -----
  /** Changer le mode d'affichage (jour / semaine / mois) */
  setViewMode: (mode: ViewMode) => void;
  /** Inverser l'affichage des RDV annulés (visible / masqué) */
  toggleShowCancelled: () => void;

  // ----- Actions : cache -----
  /** Enregistrer les rendez-vous pour une clé de cache */
  setAppointments: (key: string, appointments: Appointment[]) => void;
  /**
   * Récupérer les rendez-vous en cache pour une clé.
   * @returns Les rendez-vous ou null si pas en cache
   */
  getAppointments: (key: string) => Appointment[] | null;
  /** Vider tout le cache (à appeler après création/modif/suppression de RDV) */
  clearCache: () => void;
}

// ---------------------------------------------------------------------------
// Helpers : clés de cache (Story 3.1 Task 5)
// ---------------------------------------------------------------------------

/** Semaine ISO : lundi = début de semaine */
const WEEK_STARTS_ON = 1;

/**
 * Construit la clé de cache pour un jour (format YYYY-MM-DD).
 */
function cacheKeyDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Construit la clé de cache pour une semaine (format YYYY-Www).
 */
function cacheKeyWeek(date: Date): string {
  const year = format(date, "yyyy");
  const week = getWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Construit la clé de cache pour un mois (format YYYY-MM).
 */
function cacheKeyMonth(date: Date): string {
  return format(date, "yyyy-MM");
}

/**
 * Retourne la clé de cache correspondant à la date pivot et au mode de vue.
 * Permet aux composants d'utiliser une clé cohérente pour get/set.
 */
export function getCacheKeyForView(pivotDate: Date, viewMode: ViewMode): string {
  switch (viewMode) {
    case "day":
      return cacheKeyDay(pivotDate);
    case "week":
      return cacheKeyWeek(pivotDate);
    case "month":
      return cacheKeyMonth(pivotDate);
    default:
      return cacheKeyDay(pivotDate);
  }
}

// ---------------------------------------------------------------------------
// État initial
// ---------------------------------------------------------------------------

function getInitialPivotDate(): Date {
  return startOfDay(new Date());
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      // ----- État initial -----
      pivotDate: getInitialPivotDate(),
      viewMode: "week",
      showCancelled: false,
      appointmentsCache: {},

      // ----- Navigation (Task 3) -----
      goToNext: () => {
        const { pivotDate, viewMode } = get();
        let next: Date;
        switch (viewMode) {
          case "day":
            next = addDays(pivotDate, 1);
            break;
          case "week":
            next = addWeeks(pivotDate, 1);
            break;
          case "month":
            next = addMonths(pivotDate, 1);
            break;
          default:
            next = addDays(pivotDate, 1);
        }
        set({ pivotDate: next });
      },

      goToPrevious: () => {
        const { pivotDate, viewMode } = get();
        let prev: Date;
        switch (viewMode) {
          case "day":
            prev = addDays(pivotDate, -1);
            break;
          case "week":
            prev = addWeeks(pivotDate, -1);
            break;
          case "month":
            prev = addMonths(pivotDate, -1);
            break;
          default:
            prev = addDays(pivotDate, -1);
        }
        set({ pivotDate: prev });
      },

      goToToday: () => {
        set({ pivotDate: getInitialPivotDate() });
      },

      setDate: (date: Date) => {
        set({ pivotDate: startOfDay(date) });
      },

      // ----- Filtres (Task 4) -----
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      toggleShowCancelled: () => {
        set((state) => ({ showCancelled: !state.showCancelled }));
      },

      // ----- Cache (Task 5) -----
      setAppointments: (key: string, appointments: Appointment[]) => {
        set((state) => ({
          appointmentsCache: {
            ...state.appointmentsCache,
            [key]: appointments,
          },
        }));
      },

      getAppointments: (key: string): Appointment[] | null => {
        const cached = get().appointmentsCache[key];
        return cached ?? null;
      },

      clearCache: () => {
        set({ appointmentsCache: {} });
      },
    }),
    {
      name: "calendar-preferences",
      // Task 6 : ne persister que les préférences de vue, pas pivotDate ni cache
      partialize: (state) => ({
        viewMode: state.viewMode,
        showCancelled: state.showCancelled,
      }),
    }
  )
);
