/**
 * Tests unitaires des helpers purs de récurrence (Story 8.4, Task 2).
 *
 * Couvre :
 * - `buildRecurrenceDates` : longueur = occurrences, 1ʳᵉ date = start,
 *   espacements weekly/biweekly/monthly, cas « piège » 31 janvier (monthly),
 *   conservation de l'heure locale.
 * - `recurrenceSchema` : bornes valides, rejet occurrences < 2 / > 26 et
 *   fréquence inconnue.
 */

import { describe, expect, it } from "vitest";
import { getHours, getMinutes } from "date-fns";

import { buildRecurrenceDates } from "@/components/calendar/recurrence-utils";
import { recurrenceSchema } from "@/lib/validations/appointment";

describe("buildRecurrenceDates (Story 8.4)", () => {
  it("retourne exactement `occurrences` dates, la 1ʳᵉ = start", () => {
    const start = new Date(2026, 5, 9, 9, 0); // mar. 9 juin 2026, 09:00 local
    const dates = buildRecurrenceDates(start, "weekly", 4);
    expect(dates).toHaveLength(4);
    expect(dates[0].getTime()).toBe(start.getTime());
  });

  it("weekly : espace les dates de 7 jours", () => {
    const start = new Date(2026, 5, 9, 9, 0);
    const dates = buildRecurrenceDates(start, "weekly", 3);
    expect(dates[1].getDate()).toBe(16);
    expect(dates[2].getDate()).toBe(23);
  });

  it("biweekly : espace les dates de 14 jours", () => {
    const start = new Date(2026, 5, 9, 9, 0);
    const dates = buildRecurrenceDates(start, "biweekly", 3);
    expect(dates[1].getDate()).toBe(23); // 9 + 14
    expect(dates[2].getMonth()).toBe(6); // juillet (9 + 28 = 7 juil.)
    expect(dates[2].getDate()).toBe(7);
  });

  it("monthly : même quantième de mois", () => {
    const start = new Date(2026, 0, 15, 14, 30); // 15 janv.
    const dates = buildRecurrenceDates(start, "monthly", 3);
    expect(dates[1].getMonth()).toBe(1); // février
    expect(dates[1].getDate()).toBe(15);
    expect(dates[2].getMonth()).toBe(2); // mars
    expect(dates[2].getDate()).toBe(15);
  });

  it("monthly cas piège : 31 janvier → date-fns ramène au dernier jour de février", () => {
    const start = new Date(2026, 0, 31, 9, 0); // 31 janv. 2026
    const dates = buildRecurrenceDates(start, "monthly", 2);
    // 2026 non bissextile → 28 février (date-fns ne déborde pas sur mars).
    expect(dates[1].getMonth()).toBe(1);
    expect(dates[1].getDate()).toBe(28);
  });

  it("conserve l'heure locale de paroi (wall-clock) sur toutes les occurrences", () => {
    const start = new Date(2026, 2, 10, 9, 0); // 10 mars, 09:00
    const dates = buildRecurrenceDates(start, "weekly", 6);
    for (const d of dates) {
      expect(getHours(d)).toBe(9);
      expect(getMinutes(d)).toBe(0);
    }
  });
});

describe("recurrenceSchema (Story 8.4)", () => {
  it("accepte des bornes valides", () => {
    expect(recurrenceSchema.safeParse({ frequency: "weekly", occurrences: 2 }).success).toBe(true);
    expect(recurrenceSchema.safeParse({ frequency: "monthly", occurrences: 26 }).success).toBe(true);
    expect(recurrenceSchema.safeParse({ frequency: "biweekly", occurrences: 12 }).success).toBe(true);
  });

  it("rejette occurrences < 2", () => {
    expect(recurrenceSchema.safeParse({ frequency: "weekly", occurrences: 1 }).success).toBe(false);
  });

  it("rejette occurrences > 26", () => {
    expect(recurrenceSchema.safeParse({ frequency: "weekly", occurrences: 27 }).success).toBe(false);
  });

  it("rejette une fréquence inconnue", () => {
    expect(
      recurrenceSchema.safeParse({ frequency: "daily", occurrences: 4 }).success,
    ).toBe(false);
  });

  it("rejette un nombre d'occurrences non entier", () => {
    expect(
      recurrenceSchema.safeParse({ frequency: "weekly", occurrences: 3.5 }).success,
    ).toBe(false);
  });
});
