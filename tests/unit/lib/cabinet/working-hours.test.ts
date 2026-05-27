/**
 * Tests unitaires des helpers purs d'horaires (story 7.1).
 *
 * Couvre `toMinutes`, `fromMinutes` (aller-retour) et `rangesOverlap`
 * (cas adjacents, inclus, disjoints).
 */

import { describe, expect, it } from "vitest";
import {
  fromMinutes,
  rangesOverlap,
  toMinutes,
  type WorkingHourRange,
} from "@/lib/cabinet/working-hours";

const range = (startTime: string, endTime: string): WorkingHourRange => ({
  startTime,
  endTime,
  slotDuration: 30,
});

describe("toMinutes / fromMinutes", () => {
  it("convertit une heure en minutes depuis minuit", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("08:30")).toBe(510);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("convertit des minutes en heure HH:mm zéro-paddée", () => {
    expect(fromMinutes(0)).toBe("00:00");
    expect(fromMinutes(510)).toBe("08:30");
    expect(fromMinutes(1439)).toBe("23:59");
  });

  it("fait un aller-retour fidèle", () => {
    for (const hhmm of ["07:15", "12:00", "18:45"]) {
      expect(fromMinutes(toMinutes(hhmm))).toBe(hhmm);
    }
  });
});

describe("rangesOverlap", () => {
  it("renvoie false pour deux plages adjacentes (fin = début)", () => {
    expect(rangesOverlap(range("08:00", "12:00"), range("12:00", "18:00"))).toBe(
      false,
    );
  });

  it("renvoie true pour une plage incluse dans l'autre", () => {
    expect(rangesOverlap(range("08:00", "18:00"), range("10:00", "11:00"))).toBe(
      true,
    );
  });

  it("renvoie true pour un chevauchement partiel", () => {
    expect(rangesOverlap(range("08:00", "12:30"), range("12:00", "18:00"))).toBe(
      true,
    );
  });

  it("renvoie false pour deux plages disjointes", () => {
    expect(rangesOverlap(range("08:00", "10:00"), range("14:00", "18:00"))).toBe(
      false,
    );
  });

  it("est symétrique", () => {
    const a = range("08:00", "12:30");
    const b = range("12:00", "18:00");
    expect(rangesOverlap(a, b)).toBe(rangesOverlap(b, a));
  });
});
