/**
 * Tests unitaires du schéma de validation des notes de consultation (story 9.1).
 *
 * Scénarios 9.1-UNIT-001 à 9.1-UNIT-006.
 */

import { describe, it, expect } from "vitest";
import {
  consultationNoteSchema,
  CONSULTATION_NOTE_MAX_LENGTH,
} from "@/lib/validations/consultation-notes";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("consultationNoteSchema", () => {
  it("9.1-UNIT-001: accepte un contenu valide (et trime)", () => {
    const result = consultationNoteSchema.safeParse({
      content: "  Patient se porte bien.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Patient se porte bien.");
      expect(result.data.appointmentId).toBeUndefined();
    }
  });

  it("9.1-UNIT-002: refuse un contenu vide", () => {
    const result = consultationNoteSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("9.1-UNIT-003: refuse un contenu uniquement composé d'espaces (trim)", () => {
    const result = consultationNoteSchema.safeParse({ content: "    " });
    expect(result.success).toBe(false);
  });

  it("9.1-UNIT-004: refuse un contenu au-delà de la longueur maximale", () => {
    const result = consultationNoteSchema.safeParse({
      content: "a".repeat(CONSULTATION_NOTE_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("9.1-UNIT-005: refuse un appointmentId non-UUID", () => {
    const result = consultationNoteSchema.safeParse({
      content: "Note clinique",
      appointmentId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("9.1-UNIT-006: normalise un appointmentId vide en undefined et accepte un UUID valide", () => {
    const empty = consultationNoteSchema.safeParse({
      content: "Note clinique",
      appointmentId: "",
    });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.appointmentId).toBeUndefined();
    }

    const valid = consultationNoteSchema.safeParse({
      content: "Note clinique",
      appointmentId: VALID_UUID,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.appointmentId).toBe(VALID_UUID);
    }
  });
});
