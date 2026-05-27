/**
 * Tests unitaires de la validation cliente de l'éditeur d'horaires (story 7.1).
 *
 * Verrouille la parité entre `validateDay` (feedback inline client) et le schéma
 * Zod serveur (`lib/validations/working-hours`) : mêmes règles de format,
 * fin > début, amplitude >= slotDuration, et anti-chevauchement. Couvre le gap
 * QA TEST-001.
 */

import { describe, expect, it } from "vitest";
import {
  hasDayErrors,
  validateDay,
  type DayState,
  type RangeState,
} from "@/components/settings/schedule-model";

/** Fabrique une plage d'état client avec un id stable pour le test. */
function range(init: Partial<RangeState> = {}): RangeState {
  return {
    id: init.id ?? `r-${init.startTime ?? "08:00"}`,
    startTime: "08:00",
    endTime: "18:00",
    slotDuration: 30,
    active: true,
    ...init,
  };
}

function day(ranges: RangeState[], dayOfWeek = 1): DayState {
  return { dayOfWeek, ranges };
}

describe("validateDay", () => {
  it("ne renvoie aucune erreur pour une plage valide", () => {
    const errors = validateDay(day([range()]));
    expect(hasDayErrors(errors)).toBe(false);
    expect(errors.overlap).toBeUndefined();
    expect(errors.ranges).toEqual({});
  });

  it("ne renvoie aucune erreur pour un jour fermé (aucune plage)", () => {
    const errors = validateDay(day([]));
    expect(hasDayErrors(errors)).toBe(false);
  });

  it("ne renvoie aucune erreur pour deux plages disjointes", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "08:00", endTime: "12:00" }),
        range({ id: "b", startTime: "14:00", endTime: "18:00" }),
      ]),
    );
    expect(hasDayErrors(errors)).toBe(false);
  });

  it("signale une heure de fin antérieure ou égale au début", () => {
    const errors = validateDay(
      day([range({ id: "a", startTime: "10:00", endTime: "10:00" })]),
    );
    expect(errors.ranges.a?.endTime).toBe(
      "L'heure de fin doit être après l'heure de début.",
    );
    expect(hasDayErrors(errors)).toBe(true);
  });

  it("signale une amplitude inférieure à slotDuration", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "09:00", endTime: "09:20", slotDuration: 30 }),
      ]),
    );
    expect(errors.ranges.a?.endTime).toBe("Plage trop courte pour un créneau.");
  });

  it("signale un format d'heure invalide (début et fin)", () => {
    const errors = validateDay(
      day([range({ id: "a", startTime: "8:00", endTime: "25:00" })]),
    );
    expect(errors.ranges.a?.startTime).toBe("Heure de début invalide.");
    expect(errors.ranges.a?.endTime).toBe("Heure de fin invalide.");
  });

  it("signale un chevauchement entre deux plages valides", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "08:00", endTime: "12:30" }),
        range({ id: "b", startTime: "12:00", endTime: "18:00" }),
      ]),
    );
    expect(errors.overlap).toBe("Les plages de ce jour se chevauchent.");
    expect(hasDayErrors(errors)).toBe(true);
  });

  it("évalue le chevauchement sur toutes les plages, actives ou non (parité serveur)", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "08:00", endTime: "12:30", active: true }),
        range({ id: "b", startTime: "12:00", endTime: "18:00", active: false }),
      ]),
    );
    expect(errors.overlap).toBe("Les plages de ce jour se chevauchent.");
  });

  it("traite des plages adjacentes (fin = début) comme non chevauchantes", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "08:00", endTime: "12:00" }),
        range({ id: "b", startTime: "12:00", endTime: "18:00" }),
      ]),
    );
    expect(errors.overlap).toBeUndefined();
  });

  it("ignore le chevauchement quand une plage a un format invalide", () => {
    const errors = validateDay(
      day([
        range({ id: "a", startTime: "08:00", endTime: "12:30" }),
        range({ id: "b", startTime: "bad", endTime: "18:00" }),
      ]),
    );
    expect(errors.overlap).toBeUndefined();
    expect(errors.ranges.b?.startTime).toBe("Heure de début invalide.");
  });
});

describe("hasDayErrors", () => {
  it("renvoie false quand aucune erreur", () => {
    expect(hasDayErrors({ ranges: {} })).toBe(false);
  });

  it("renvoie true sur une erreur de plage", () => {
    expect(hasDayErrors({ ranges: { a: { endTime: "x" } } })).toBe(true);
  });

  it("renvoie true sur une erreur de chevauchement", () => {
    expect(hasDayErrors({ ranges: {}, overlap: "x" })).toBe(true);
  });
});
