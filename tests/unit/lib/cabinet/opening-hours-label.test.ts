/**
 * Tests unitaires du helper `formatOpeningHoursLabel` (story 7.4, AC 4).
 *
 * Couverture : semaine uniforme, jours disjoints, plages multiples par jour,
 * filtrage des plages inactives, ordre lundi→dimanche, repli si vide.
 */

import { describe, it, expect } from "vitest";
import {
  formatOpeningHoursLabel,
  OPENING_HOURS_FALLBACK,
  type OpeningHoursRow,
} from "@/lib/cabinet/opening-hours-label";

const range = (
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  active = true,
): OpeningHoursRow => ({ dayOfWeek, startTime, endTime, active });

describe("formatOpeningHoursLabel", () => {
  it("renvoie le repli neutre si aucune plage", () => {
    expect(formatOpeningHoursLabel([])).toBe(OPENING_HOURS_FALLBACK);
  });

  it("renvoie le repli si toutes les plages sont inactives", () => {
    expect(
      formatOpeningHoursLabel([range(1, "09:00", "18:00", false)]),
    ).toBe(OPENING_HOURS_FALLBACK);
  });

  it("regroupe une semaine uniforme Lun–Ven", () => {
    const rows = [1, 2, 3, 4, 5].map((d) => range(d, "09:00", "18:00"));
    expect(formatOpeningHoursLabel(rows)).toBe("Lun–Ven : 9h–18h");
  });

  it("sépare un samedi aux horaires différents", () => {
    const rows = [
      ...[1, 2, 3, 4, 5].map((d) => range(d, "09:00", "18:00")),
      range(6, "09:00", "12:00"),
    ];
    expect(formatOpeningHoursLabel(rows)).toBe(
      "Lun–Ven : 9h–18h · Sam : 9h–12h",
    );
  });

  it("ne regroupe pas des jours non consécutifs (un jour fermé rompt le groupe)", () => {
    const rows = [range(1, "09:00", "18:00"), range(3, "09:00", "18:00")];
    expect(formatOpeningHoursLabel(rows)).toBe(
      "Lun : 9h–18h · Mer : 9h–18h",
    );
  });

  it("agrège les plages multiples d'un même jour, triées par heure", () => {
    const rows = [
      range(1, "14:00", "18:00"),
      range(1, "09:00", "12:00"),
    ];
    expect(formatOpeningHoursLabel(rows)).toBe("Lun : 9h–12h, 14h–18h");
  });

  it("formate les minutes non nulles (9h30)", () => {
    expect(formatOpeningHoursLabel([range(2, "09:30", "12:00")])).toBe(
      "Mar : 9h30–12h",
    );
  });

  it("place le dimanche en dernier dans l'ordre d'affichage", () => {
    const rows = [range(0, "10:00", "12:00"), range(1, "09:00", "18:00")];
    expect(formatOpeningHoursLabel(rows)).toBe(
      "Lun : 9h–18h · Dim : 10h–12h",
    );
  });

  it("ignore les plages inactives mais conserve les actives", () => {
    const rows = [
      range(1, "09:00", "18:00"),
      range(2, "09:00", "18:00", false),
    ];
    expect(formatOpeningHoursLabel(rows)).toBe("Lun : 9h–18h");
  });
});
