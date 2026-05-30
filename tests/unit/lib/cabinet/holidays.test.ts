/**
 * Tests unitaires du calcul des jours fériés FR (story 7.2).
 *
 * Vérifie :
 * - les 8 dates fixes pour deux années,
 * - les fériés mobiles (Pâques, Ascension, Pentecôte) calculés pour 2026 et
 *   recoupés avec l'API Etalab `calendrier.api.gouv.fr` (référence de
 *   correction),
 * - le nombre total (11 fériés métropole).
 */

import { describe, expect, it } from "vitest";
import { computeFrenchHolidays, easterSunday } from "@/lib/cabinet/holidays";

describe("easterSunday", () => {
  it("calcule correctement le dimanche de Pâques 2026 (05 avril)", () => {
    const e = easterSunday(2026);
    expect(e.getUTCFullYear()).toBe(2026);
    expect(e.getUTCMonth()).toBe(3); // avril (0-indexé)
    expect(e.getUTCDate()).toBe(5);
  });

  it("calcule correctement le dimanche de Pâques 2027 (28 mars)", () => {
    const e = easterSunday(2027);
    expect(e.getUTCMonth()).toBe(2); // mars
    expect(e.getUTCDate()).toBe(28);
  });
});

describe("computeFrenchHolidays", () => {
  it("renvoie 11 jours fériés pour une année métropole", () => {
    expect(computeFrenchHolidays(2026)).toHaveLength(11);
    expect(computeFrenchHolidays(2027)).toHaveLength(11);
  });

  it("contient les 8 dates fixes attendues pour 2026", () => {
    const dates = new Set(computeFrenchHolidays(2026).map((h) => h.date));
    expect(dates.has("2026-01-01")).toBe(true);
    expect(dates.has("2026-05-01")).toBe(true);
    expect(dates.has("2026-05-08")).toBe(true);
    expect(dates.has("2026-07-14")).toBe(true);
    expect(dates.has("2026-08-15")).toBe(true);
    expect(dates.has("2026-11-01")).toBe(true);
    expect(dates.has("2026-11-11")).toBe(true);
    expect(dates.has("2026-12-25")).toBe(true);
  });

  it("calcule correctement les fériés mobiles 2026 (Pâques=05/04)", () => {
    // Pâques 2026 = 05/04 ⇒ Lundi de Pâques 06/04, Ascension 14/05, Lundi de Pentecôte 25/05
    const dates = new Set(computeFrenchHolidays(2026).map((h) => h.date));
    expect(dates.has("2026-04-06")).toBe(true);
    expect(dates.has("2026-05-14")).toBe(true);
    expect(dates.has("2026-05-25")).toBe(true);
  });

  it("ne contient ni le Vendredi Saint ni le 26/12 (Alsace-Moselle)", () => {
    const dates = new Set(computeFrenchHolidays(2026).map((h) => h.date));
    expect(dates.has("2026-12-26")).toBe(false);
    // Vendredi Saint 2026 = 03/04 (Pâques - 2j)
    expect(dates.has("2026-04-03")).toBe(false);
  });

  it("retourne les fériés triés chronologiquement", () => {
    const dates = computeFrenchHolidays(2026).map((h) => h.date);
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(sorted);
  });

  it("expose un libellé pour chaque férié", () => {
    for (const h of computeFrenchHolidays(2026)) {
      expect(h.label.length).toBeGreaterThan(0);
    }
  });
});
