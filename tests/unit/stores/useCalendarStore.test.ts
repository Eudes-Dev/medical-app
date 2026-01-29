/**
 * Tests unitaires pour le store useCalendarStore (Story 3.1).
 *
 * Vérifie :
 * - La navigation (date pivot : suivant, précédent, aujourd'hui, setDate)
 * - Les transitions jour / semaine / mois
 * - Les filtres (viewMode, showCancelled)
 * - Le cache (setAppointments, getAppointments, clearCache)
 */

import { addWeeks, format, startOfDay } from "date-fns";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Appointment } from "@/types";
import {
  getCacheKeyForView,
  useCalendarStore,
  type ViewMode,
} from "@/stores/useCalendarStore";

// Clé localStorage utilisée par le middleware persist
const STORAGE_KEY = "calendar-preferences";

/** Crée un rendez-vous minimal pour les tests */
function mockAppointment(overrides: Partial<Appointment> = {}): Appointment {
  const base = new Date("2026-01-27T09:00:00Z");
  return {
    id: "apt-1",
    patientId: "patient-1",
    startTime: base,
    endTime: new Date(base.getTime() + 30 * 60 * 1000),
    status: "CONFIRMED",
    type: "Consultation",
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

describe("useCalendarStore", () => {
  beforeEach(() => {
    // Éviter que la persistance d'un test précédent affecte le suivant
    localStorage.removeItem(STORAGE_KEY);
    // Remettre le store dans un état connu (Zustand conserve l'instance entre tests)
    useCalendarStore.setState({
      pivotDate: startOfDay(new Date("2026-01-27")),
      viewMode: "week",
      showCancelled: false,
      appointmentsCache: {},
    });
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  describe("navigation", () => {
    it("goToNext avance d'un jour en mode day", () => {
      useCalendarStore.setState({
        pivotDate: new Date("2026-01-27"),
        viewMode: "day",
      });
      useCalendarStore.getState().goToNext();
      const next = useCalendarStore.getState().pivotDate;
      expect(format(next, "yyyy-MM-dd")).toBe("2026-01-28");
    });

    it("goToNext avance d'une semaine en mode week", () => {
      useCalendarStore.setState({
        pivotDate: new Date("2026-01-27"),
        viewMode: "week",
      });
      useCalendarStore.getState().goToNext();
      const next = useCalendarStore.getState().pivotDate;
      expect(next.getTime()).toBe(
        addWeeks(new Date("2026-01-27"), 1).getTime()
      );
    });

    it("goToNext avance d'un mois en mode month", () => {
      useCalendarStore.setState({
        pivotDate: new Date("2026-01-27"),
        viewMode: "month",
      });
      useCalendarStore.getState().goToNext();
      const next = useCalendarStore.getState().pivotDate;
      expect(format(next, "yyyy-MM")).toBe("2026-02");
    });

    it("goToPrevious recule d'un jour en mode day", () => {
      useCalendarStore.setState({
        pivotDate: new Date("2026-01-27"),
        viewMode: "day",
      });
      useCalendarStore.getState().goToPrevious();
      const prev = useCalendarStore.getState().pivotDate;
      expect(format(prev, "yyyy-MM-dd")).toBe("2026-01-26");
    });

    it("goToToday remet la date pivot au début du jour actuel", () => {
      useCalendarStore.setState({
        pivotDate: new Date("2026-06-15T12:00:00"),
      });
      useCalendarStore.getState().goToToday();
      const today = useCalendarStore.getState().pivotDate;
      const expected = startOfDay(new Date());
      expect(format(today, "yyyy-MM-dd")).toBe(format(expected, "yyyy-MM-dd"));
    });

    it("setDate définit la date pivot à la date donnée (début de jour)", () => {
      const target = new Date("2026-03-10T14:30:00");
      useCalendarStore.getState().setDate(target);
      const pivot = useCalendarStore.getState().pivotDate;
      expect(format(pivot, "yyyy-MM-dd")).toBe("2026-03-10");
      expect(pivot.getHours()).toBe(0);
      expect(pivot.getMinutes()).toBe(0);
    });
  });

  describe("filtres de vue", () => {
    it("setViewMode change le mode d'affichage", () => {
      const modes: ViewMode[] = ["day", "week", "month"];
      for (const mode of modes) {
        useCalendarStore.getState().setViewMode(mode);
        expect(useCalendarStore.getState().viewMode).toBe(mode);
      }
    });

    it("toggleShowCancelled inverse showCancelled", () => {
      expect(useCalendarStore.getState().showCancelled).toBe(false);
      useCalendarStore.getState().toggleShowCancelled();
      expect(useCalendarStore.getState().showCancelled).toBe(true);
      useCalendarStore.getState().toggleShowCancelled();
      expect(useCalendarStore.getState().showCancelled).toBe(false);
    });
  });

  describe("cache", () => {
    it("setAppointments puis getAppointments retourne les RDV en cache", () => {
      const key = "2026-01-27";
      const appointments = [mockAppointment(), mockAppointment({ id: "apt-2" })];
      useCalendarStore.getState().setAppointments(key, appointments);
      const cached = useCalendarStore.getState().getAppointments(key);
      expect(cached).toEqual(appointments);
    });

    it("getAppointments retourne null pour une clé non en cache", () => {
      const cached = useCalendarStore.getState().getAppointments("2026-99-99");
      expect(cached).toBeNull();
    });

    it("clearCache vide le cache", () => {
      useCalendarStore.getState().setAppointments("2026-01-27", [mockAppointment()]);
      expect(useCalendarStore.getState().getAppointments("2026-01-27")).toHaveLength(1);
      useCalendarStore.getState().clearCache();
      expect(useCalendarStore.getState().getAppointments("2026-01-27")).toBeNull();
    });
  });

  describe("getCacheKeyForView", () => {
    const date = new Date("2026-01-27T12:00:00");

    it("retourne YYYY-MM-DD pour le mode day", () => {
      expect(getCacheKeyForView(date, "day")).toBe("2026-01-27");
    });

    it("retourne YYYY-Www pour le mode week", () => {
      const key = getCacheKeyForView(date, "week");
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("retourne YYYY-MM pour le mode month", () => {
      expect(getCacheKeyForView(date, "month")).toBe("2026-01");
    });
  });
});
