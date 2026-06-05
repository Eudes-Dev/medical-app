/**
 * Tests unitaires des helpers purs de la vue mois (Story 8.3, Task 1).
 *
 * Couvre :
 * - `buildMonthMatrix` : longueur multiple de 7, 1ʳᵉ date = lundi, dernière =
 *   dimanche, drapeau `inCurrentMonth` (vrai pour un jour du mois, faux pour un
 *   débordement de semaine), sur des mois « pièges » (1er en milieu de semaine,
 *   mois à 6 lignes).
 * - `getMonthFetchRange` : bornes lundi 8h → dimanche 20h.
 */

import { describe, expect, it } from "vitest";
import { getDay, getHours, getMinutes, getSeconds } from "date-fns";

import {
  buildMonthMatrix,
  getMonthFetchRange,
} from "@/components/calendar/month-utils";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
} from "@/components/calendar/calendar-utils";

/** Helper local : `YYYY-MM-DD` en heure locale (comme le dashboard). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("month-utils (Story 8.3)", () => {
  describe("buildMonthMatrix", () => {
    it("retourne une longueur multiple de 7 (semaines complètes)", () => {
      // Juin 2026 : 1er = lundi → exactement 5 semaines (35 jours).
      const cells = buildMonthMatrix(new Date(2026, 5, 15));
      expect(cells.length % 7).toBe(0);
      expect(cells.length).toBe(35);
    });

    it("commence un lundi et finit un dimanche", () => {
      const cells = buildMonthMatrix(new Date(2026, 5, 15)); // juin 2026
      // date-fns : getDay() → 0 = dimanche, 1 = lundi.
      expect(getDay(cells[0].date)).toBe(1);
      expect(getDay(cells[cells.length - 1].date)).toBe(0);
    });

    it("inCurrentMonth vrai pour un jour du mois, faux pour un débordement", () => {
      // Juin 2026 : 1er juin = lundi, donc la 1ʳᵉ cellule EST le 1er juin (pas
      // de débordement avant). On prend un mois piège pour les débordements :
      // mars 2026 — 1er mars = dimanche → la grille démarre lundi 23 février.
      const cells = buildMonthMatrix(new Date(2026, 2, 10)); // mars 2026
      const first = cells[0];
      // La 1ʳᵉ cellule est un débordement (février), donc inCurrentMonth=false.
      expect(first.inCurrentMonth).toBe(false);
      expect(ymd(first.date)).toBe("2026-02-23");

      // Un jour clairement dans le mois pivot.
      const march10 = cells.find((c) => ymd(c.date) === "2026-03-10");
      expect(march10?.inCurrentMonth).toBe(true);

      // Un débordement de fin de grille (avril) doit être présent et atténué.
      const overflowAfter = cells.find((c) => c.date.getMonth() === 3);
      expect(overflowAfter?.inCurrentMonth).toBe(false);
    });

    it("gère un mois à 6 lignes (42 cellules)", () => {
      // Août 2026 : 1er août = samedi → la grille déborde sur 6 semaines.
      const cells = buildMonthMatrix(new Date(2026, 7, 1));
      expect(cells.length).toBe(42);
      expect(getDay(cells[0].date)).toBe(1); // lundi
      expect(getDay(cells[41].date)).toBe(0); // dimanche
      // Le 1er août (samedi) doit appartenir au mois.
      const aug1 = cells.find((c) => ymd(c.date) === "2026-08-01");
      expect(aug1?.inCurrentMonth).toBe(true);
    });
  });

  describe("getMonthFetchRange", () => {
    it("borne le début au lundi de la 1ʳᵉ semaine à 8h00", () => {
      // Mars 2026 : grille démarre lundi 23 février.
      const { startDate } = getMonthFetchRange(new Date(2026, 2, 10));
      expect(ymd(startDate)).toBe("2026-02-23");
      expect(getDay(startDate)).toBe(1); // lundi
      expect(getHours(startDate)).toBe(GRID_START_HOUR);
      expect(getMinutes(startDate)).toBe(0);
      expect(getSeconds(startDate)).toBe(0);
    });

    it("borne la fin au dimanche de la dernière semaine à 20h00", () => {
      // Mars 2026 : 31 mars = mardi → grille finit dimanche 5 avril.
      const { endDate } = getMonthFetchRange(new Date(2026, 2, 10));
      expect(ymd(endDate)).toBe("2026-04-05");
      expect(getDay(endDate)).toBe(0); // dimanche
      expect(getHours(endDate)).toBe(GRID_END_HOUR);
      expect(getMinutes(endDate)).toBe(0);
      expect(getSeconds(endDate)).toBe(0);
    });

    it("couvre exactement les bornes de la matrice du mois", () => {
      const pivot = new Date(2026, 7, 1); // août 2026 (6 lignes)
      const cells = buildMonthMatrix(pivot);
      const { startDate, endDate } = getMonthFetchRange(pivot);
      expect(ymd(startDate)).toBe(ymd(cells[0].date));
      expect(ymd(endDate)).toBe(ymd(cells[cells.length - 1].date));
    });
  });
});
