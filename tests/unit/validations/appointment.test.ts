/**
 * Tests unitaires pour le schéma de validation rendez-vous (Story 3.3).
 *
 * Test IDs: 3.3-UNIT-001, 3.3-UNIT-002, 3.3-UNIT-003
 * AC: 3
 */

import { describe, it, expect } from "vitest";
import {
  appointmentSchema,
  APPOINTMENT_DURATIONS,
  APPOINTMENT_TYPES,
} from "@/lib/validations/appointment";

describe("appointmentSchema (Story 3.3)", () => {
  const oneHourLater = () => new Date(Date.now() + 60 * 60 * 1000);
  const validValues = () => ({
    patientId: "11111111-1111-1111-1111-111111111111",
    startTime: oneHourLater(),
    duration: 30,
    type: "Suivi" as const,
    notes: "Quelques notes",
  });

  it("3.3-UNIT-001: valide des données complètes correctes", () => {
    const result = appointmentSchema.safeParse(validValues());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientId).toBe(
        "11111111-1111-1111-1111-111111111111"
      );
      expect(result.data.duration).toBe(30);
      expect(result.data.type).toBe("Suivi");
      expect(result.data.notes).toBe("Quelques notes");
    }
  });

  it("3.3-UNIT-001: accepte un rendez-vous sans notes (optionnel)", () => {
    const { notes: _omit, ...withoutNotes } = validValues();
    const result = appointmentSchema.safeParse(withoutNotes);
    expect(result.success).toBe(true);
  });

  it("3.3-UNIT-001: accepte toutes les durées autorisées", () => {
    for (const duration of APPOINTMENT_DURATIONS) {
      const result = appointmentSchema.safeParse({
        ...validValues(),
        duration,
      });
      expect(result.success).toBe(true);
    }
  });

  it("3.3-UNIT-001: accepte tous les types de consultation prédéfinis", () => {
    for (const type of APPOINTMENT_TYPES) {
      const result = appointmentSchema.safeParse({ ...validValues(), type });
      expect(result.success).toBe(true);
    }
  });

  it("3.3-UNIT-002: rejette un patientId vide", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      patientId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("patientId")
      );
      expect(issue?.message).toMatch(/patient/i);
    }
  });

  it("3.3-UNIT-002: rejette une startTime dans le passé", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      startTime: new Date(Date.now() - 60 * 60 * 1000),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("startTime")
      );
      expect(issue?.message).toMatch(/futur/i);
    }
  });

  it("3.3-UNIT-002: rejette une durée non autorisée (20 min)", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      duration: 20,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("duration")
      );
      expect(issue?.message).toMatch(/15.*30.*45.*60/);
    }
  });

  // Story 7.3 : `type` n'est plus une enum statique mais un libellé-instantané
  // (snapshot) libre — le catalogue dynamique `ServiceType` (FK `serviceTypeId`)
  // remplace l'enum. Un libellé personnalisé est donc désormais accepté.
  it("3.3-UNIT-002 / 7.3: accepte un libellé de type personnalisé (snapshot)", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      type: "Téléconsultation",
    });
    expect(result.success).toBe(true);
  });

  it("3.3-UNIT-002 / 7.3: rejette un type vide (chaîne après trim)", () => {
    const result = appointmentSchema.safeParse({ ...validValues(), type: "  " });
    expect(result.success).toBe(false);
  });

  it("7.3: accepte un serviceTypeId UUID valide", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      serviceTypeId: "77777777-7777-4777-8777-777777777777",
    });
    expect(result.success).toBe(true);
  });

  it("7.3: rejette un serviceTypeId non-UUID", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      serviceTypeId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes("serviceTypeId")
      );
      expect(issue).toBeDefined();
    }
  });

  it("3.3-UNIT-003: rejette des notes de plus de 500 caractères", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      notes: "a".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("notes"));
      expect(issue?.message).toMatch(/500/);
    }
  });

  it("3.3-UNIT-003: accepte des notes de pile 500 caractères", () => {
    const result = appointmentSchema.safeParse({
      ...validValues(),
      notes: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});
