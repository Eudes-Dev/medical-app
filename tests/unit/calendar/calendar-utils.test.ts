/**
 * Tests unitaires pour les utilitaires calendrier (Story 3.2).
 *
 * Scénarios: 3.2-UNIT-001 à 3.2-UNIT-005
 * - calculateTop, calculateHeight, getDurationMinutes
 * - getStatusBgClass / STATUS_BG_COLORS
 * - Bornes 0–100 % pour top/height
 */

import { describe, expect, it } from "vitest";
import {
  calculateTop,
  calculateHeight,
  getDurationMinutes,
  getStatusBgClass,
  STATUS_BG_COLORS,
  GRID_START_HOUR,
  GRID_TOTAL_MINUTES,
} from "@/components/calendar/calendar-utils";

describe("calendar-utils (Story 3.2)", () => {
  describe("calculateTop (3.2-UNIT-001)", () => {
    it("3.2-UNIT-001: 8h00 = 0%", () => {
      const d = new Date("2026-01-27T08:00:00");
      expect(calculateTop(d)).toBe("0%");
    });

    it("20h00 = 100%", () => {
      const d = new Date("2026-01-27T20:00:00");
      expect(calculateTop(d)).toBe("100%");
    });

    it("12h00 = 4h après 8h → 33.33%", () => {
      const d = new Date(2026, 0, 27, 12, 0, 0); // 12h locale
      expect(calculateTop(d)).toBe("33.33333333333333%");
    });

    it("14h00 = 50%", () => {
      const d = new Date(2026, 0, 27, 14, 0, 0); // 14h locale = milieu de plage
      expect(calculateTop(d)).toBe("50%");
    });

    it("9h30 = 12.5% (1h30 après 8h)", () => {
      const d = new Date("2026-01-27T09:30:00");
      expect(calculateTop(d)).toBe("12.5%");
    });

    it("3.2-UNIT-005: avant 8h est borné à 0%", () => {
      const d = new Date("2026-01-27T07:00:00");
      expect(calculateTop(d)).toBe("0%");
    });

    it("3.2-UNIT-005: après 20h est borné à 100%", () => {
      const d = new Date("2026-01-27T21:00:00");
      expect(calculateTop(d)).toBe("100%");
    });
  });

  describe("calculateHeight (3.2-UNIT-002)", () => {
    it("3.2-UNIT-002: 30 min ≈ 4.17%", () => {
      const h = calculateHeight(30);
      expect(h).toBe("4.166666666666666%");
    });

    it("60 min = 8.33…%", () => {
      const h = calculateHeight(60);
      expect(parseFloat(h)).toBeCloseTo((60 / GRID_TOTAL_MINUTES) * 100);
    });

    it("720 min (12h) = 100%", () => {
      expect(calculateHeight(720)).toBe("100%");
    });

    it("3.2-UNIT-005: durée > 12h bornée à 100%", () => {
      expect(calculateHeight(800)).toBe("100%");
    });
  });

  describe("getDurationMinutes (3.2-UNIT-003)", () => {
    it("3.2-UNIT-003: calcule la durée entre startTime et endTime", () => {
      const start = new Date("2026-01-27T10:00:00");
      const end = new Date("2026-01-27T10:30:00");
      expect(getDurationMinutes(start, end)).toBe(30);
    });

    it("1h = 60", () => {
      const start = new Date("2026-01-27T09:00:00");
      const end = new Date("2026-01-27T10:00:00");
      expect(getDurationMinutes(start, end)).toBe(60);
    });

    it("arrondit à l'entier", () => {
      const start = new Date("2026-01-27T10:00:00");
      const end = new Date("2026-01-27T10:30:30"); // 30.5 min
      expect(getDurationMinutes(start, end)).toBe(31);
    });
  });

  describe("getStatusBgClass / STATUS_BG_COLORS (3.2-UNIT-004)", () => {
    it("3.2-UNIT-004: CONFIRMED = emerald", () => {
      expect(getStatusBgClass("CONFIRMED")).toContain("emerald");
      expect(STATUS_BG_COLORS.CONFIRMED).toBe("bg-emerald-500 text-white");
    });

    it("PENDING = amber", () => {
      expect(getStatusBgClass("PENDING")).toContain("amber");
      expect(STATUS_BG_COLORS.PENDING).toBe("bg-amber-500 text-white");
    });

    it("CANCELLED = rose", () => {
      expect(getStatusBgClass("CANCELLED")).toContain("rose");
      expect(STATUS_BG_COLORS.CANCELLED).toBe("bg-rose-500 text-white");
    });

    it("COMPLETED = gray", () => {
      expect(getStatusBgClass("COMPLETED")).toContain("gray");
      expect(STATUS_BG_COLORS.COMPLETED).toBe("bg-gray-500 text-white");
    });

    it("statut inconnu fallback gray", () => {
      expect(getStatusBgClass("CONFIRMED" as any)).toBe("bg-emerald-500 text-white");
      // getStatusBgClass avec une clé absente du Record retourne le fallback
      const unknown = "UNKNOWN" as any;
      expect(getStatusBgClass(unknown)).toBe("bg-gray-500 text-white");
    });
  });

  describe("constants", () => {
    it("GRID_START_HOUR = 8", () => {
      expect(GRID_START_HOUR).toBe(8);
    });
    it("GRID_TOTAL_MINUTES = 720", () => {
      expect(GRID_TOTAL_MINUTES).toBe(720);
    });
  });
});
