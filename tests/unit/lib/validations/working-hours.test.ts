/**
 * Tests unitaires des schémas Zod d'horaires (story 7.1).
 *
 * Couvre les refinements : chevauchement, fin ≤ début, amplitude < slotDuration,
 * slotDuration hors enum, ainsi que des cas valides.
 */

import { describe, expect, it } from "vitest";
import {
  dayScheduleSchema,
  timeRangeSchema,
  weekScheduleSchema,
} from "@/lib/validations/working-hours";

describe("timeRangeSchema", () => {
  it("accepte une plage valide", () => {
    const r = timeRangeSchema.safeParse({
      startTime: "08:00",
      endTime: "18:00",
      slotDuration: 30,
      active: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejette une heure de fin antérieure ou égale au début", () => {
    expect(
      timeRangeSchema.safeParse({
        startTime: "10:00",
        endTime: "10:00",
        slotDuration: 30,
        active: true,
      }).success,
    ).toBe(false);
    expect(
      timeRangeSchema.safeParse({
        startTime: "12:00",
        endTime: "09:00",
        slotDuration: 30,
        active: true,
      }).success,
    ).toBe(false);
  });

  it("rejette une amplitude inférieure à slotDuration", () => {
    const r = timeRangeSchema.safeParse({
      startTime: "09:00",
      endTime: "09:20",
      slotDuration: 30,
      active: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejette une slotDuration hors enum", () => {
    const r = timeRangeSchema.safeParse({
      startTime: "08:00",
      endTime: "18:00",
      slotDuration: 20,
      active: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejette un format d'heure invalide", () => {
    expect(
      timeRangeSchema.safeParse({
        startTime: "8:00",
        endTime: "18:00",
        slotDuration: 30,
        active: true,
      }).success,
    ).toBe(false);
    expect(
      timeRangeSchema.safeParse({
        startTime: "08:00",
        endTime: "25:00",
        slotDuration: 30,
        active: true,
      }).success,
    ).toBe(false);
  });
});

describe("dayScheduleSchema", () => {
  it("accepte deux plages disjointes le même jour", () => {
    const r = dayScheduleSchema.safeParse({
      dayOfWeek: 1,
      ranges: [
        { startTime: "08:00", endTime: "12:00", slotDuration: 30, active: true },
        { startTime: "14:00", endTime: "18:00", slotDuration: 30, active: true },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejette deux plages qui se chevauchent", () => {
    const r = dayScheduleSchema.safeParse({
      dayOfWeek: 1,
      ranges: [
        { startTime: "08:00", endTime: "12:30", slotDuration: 30, active: true },
        { startTime: "12:00", endTime: "18:00", slotDuration: 30, active: true },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("accepte un jour sans plage (fermé)", () => {
    const r = dayScheduleSchema.safeParse({ dayOfWeek: 0, ranges: [] });
    expect(r.success).toBe(true);
  });

  it("rejette un dayOfWeek hors 0–6", () => {
    expect(
      dayScheduleSchema.safeParse({ dayOfWeek: 7, ranges: [] }).success,
    ).toBe(false);
  });
});

describe("weekScheduleSchema", () => {
  it("valide un planning complet de 7 jours", () => {
    const week = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      ranges:
        dayOfWeek >= 1 && dayOfWeek <= 5
          ? [
              {
                startTime: "08:00",
                endTime: "18:00",
                slotDuration: 30 as const,
                active: true,
              },
            ]
          : [],
    }));
    expect(weekScheduleSchema.safeParse(week).success).toBe(true);
  });
});
