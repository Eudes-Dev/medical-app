/**
 * Tests unitaires de la validation et du tri de la liste d'attente (story 8.5).
 *
 * Couvre :
 * - `waitlistEntrySchema` : payload minimal valide (patient seul, priorité par
 *   défaut), rejets (patient manquant, reason/notes trop longs, serviceTypeId
 *   non-UUID, fenêtre incohérente), fenêtre valide et absence de fenêtre.
 * - `compareWaitlistEntries` / `sortWaitlistEntries` : ordre URGENT > HIGH >
 *   NORMAL puis FIFO à priorité égale.
 */

import { describe, expect, it } from "vitest";

import { waitlistEntrySchema } from "@/lib/validations/waitlist";
import {
  compareWaitlistEntries,
  sortWaitlistEntries,
  WAITLIST_PRIORITY_WEIGHT,
} from "@/lib/waitlist/waitlist-utils";

const PATIENT_UUID = "11111111-1111-4111-8111-111111111111";
const SERVICE_UUID = "22222222-2222-4222-8222-222222222222";

describe("waitlistEntrySchema (Story 8.5)", () => {
  it("accepte un payload minimal (patient seul) et applique la priorité par défaut", () => {
    const parsed = waitlistEntrySchema.safeParse({ patientId: PATIENT_UUID });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.priority).toBe("NORMAL");
      expect(parsed.data.serviceTypeId).toBeUndefined();
    }
  });

  it("rejette un patientId manquant", () => {
    const parsed = waitlistEntrySchema.safeParse({ priority: "HIGH" });
    expect(parsed.success).toBe(false);
  });

  it("rejette un serviceTypeId non-UUID", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      serviceTypeId: "pas-un-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejette un motif > 200 caractères", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      reason: "x".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejette des notes > 500 caractères", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      notes: "x".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejette une fenêtre incohérente (preferredTo < preferredFrom)", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      preferredFrom: new Date(Date.UTC(2026, 6, 10)),
      preferredTo: new Date(Date.UTC(2026, 6, 5)),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("preferredTo"))).toBe(
        true,
      );
    }
  });

  it("accepte une fenêtre valide (preferredTo >= preferredFrom) et un service UUID", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      serviceTypeId: SERVICE_UUID,
      priority: "URGENT",
      preferredFrom: new Date(Date.UTC(2026, 6, 5)),
      preferredTo: new Date(Date.UTC(2026, 6, 10)),
    });
    expect(parsed.success).toBe(true);
  });

  it("normalise reason/notes vides (ou espaces) en undefined (#6)", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      reason: "   ",
      notes: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reason).toBeUndefined();
      expect(parsed.data.notes).toBeUndefined();
    }
  });

  it("accepte l'absence totale de fenêtre", () => {
    const parsed = waitlistEntrySchema.safeParse({
      patientId: PATIENT_UUID,
      priority: "HIGH",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("tri de la file (Story 8.5)", () => {
  it("ordonne les poids URGENT > HIGH > NORMAL", () => {
    expect(WAITLIST_PRIORITY_WEIGHT.URGENT).toBeGreaterThan(
      WAITLIST_PRIORITY_WEIGHT.HIGH,
    );
    expect(WAITLIST_PRIORITY_WEIGHT.HIGH).toBeGreaterThan(
      WAITLIST_PRIORITY_WEIGHT.NORMAL,
    );
  });

  it("trie par priorité décroissante puis FIFO (createdAt croissant)", () => {
    const t0 = new Date("2026-06-01T09:00:00Z");
    const t1 = new Date("2026-06-02T09:00:00Z");
    const t2 = new Date("2026-06-03T09:00:00Z");
    const entries = [
      { id: "a", priority: "NORMAL" as const, createdAt: t0 },
      { id: "b", priority: "URGENT" as const, createdAt: t2 },
      { id: "c", priority: "HIGH" as const, createdAt: t1 },
      { id: "d", priority: "URGENT" as const, createdAt: t0 },
    ];
    const sorted = sortWaitlistEntries(entries);
    expect(sorted.map((e) => e.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("compareWaitlistEntries départage deux URGENT par ancienneté", () => {
    const older = { priority: "URGENT" as const, createdAt: new Date("2026-06-01") };
    const newer = { priority: "URGENT" as const, createdAt: new Date("2026-06-05") };
    expect(compareWaitlistEntries(older, newer)).toBeLessThan(0);
  });
});
