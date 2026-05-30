/**
 * Tests unitaires du schéma Zod `timeOffSchema` (story 7.2, AC 5).
 *
 * Couvre :
 * - `endDate < startDate` ⇒ rejeté
 * - `!allDay` avec `startDate ≠ endDate` ⇒ rejeté (un seul jour autorisé)
 * - `!allDay` sans `startTime`/`endTime` ⇒ rejeté
 * - `endTime ≤ startTime` ⇒ rejeté
 * - cas valides (congé pluri-jours, demi-journée)
 * - `reason` borné à 200 caractères
 */

import { describe, expect, it } from "vitest";
import {
  TIME_OFF_REASON_MAX_LENGTH,
  timeOffSchema,
} from "@/lib/validations/time-off";

const day = (iso: string) => new Date(iso);

describe("timeOffSchema", () => {
  it("accepte une plage de jours allDay valide", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-15"),
      allDay: true,
    });
    expect(r.success).toBe(true);
  });

  it("accepte une plage horaire (allDay=false) sur un seul jour", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-01"),
      allDay: false,
      startTime: "12:00",
      endTime: "14:00",
    });
    expect(r.success).toBe(true);
  });

  it("rejette endDate < startDate", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-15"),
      endDate: day("2026-07-01"),
      allDay: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejette une plage horaire qui s'étend sur plusieurs jours", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-02"),
      allDay: false,
      startTime: "09:00",
      endTime: "12:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejette une plage horaire sans heures de début/fin", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-01"),
      allDay: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejette endTime <= startTime", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-01"),
      allDay: false,
      startTime: "14:00",
      endTime: "14:00",
    });
    expect(r.success).toBe(false);
  });

  it("rejette un motif > 200 caractères", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-01"),
      allDay: true,
      reason: "x".repeat(TIME_OFF_REASON_MAX_LENGTH + 1),
    });
    expect(r.success).toBe(false);
  });

  it("rejette un format d'heure invalide", () => {
    const r = timeOffSchema.safeParse({
      startDate: day("2026-07-01"),
      endDate: day("2026-07-01"),
      allDay: false,
      startTime: "9:00",
      endTime: "12:00",
    });
    expect(r.success).toBe(false);
  });
});
