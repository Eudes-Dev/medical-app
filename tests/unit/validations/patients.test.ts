/**
 * Tests unitaires pour le schéma de validation patient (Story 2.2)
 *
 * Test IDs: 2.2-UNIT-001, 2.2-UNIT-002, 2.2-UNIT-003, 2.2-UNIT-004, 2.2-UNIT-005
 * AC: 2, 3
 */

import { describe, it, expect } from "vitest";
import { patientSchema } from "@/lib/validations/patients";

describe("patientSchema (Story 2.2)", () => {
  const validPatient = {
    lastName: "Martin",
    firstName: "Jean",
    phone: "0612345678",
    email: "jean@example.com",
  };

  it("2.2-UNIT-001: devrait valider les champs requis et optionnels", () => {
    const result = patientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastName).toBe("Martin");
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.phone).toBe("0612345678");
      expect(result.data.email).toBe("jean@example.com");
    }
  });

  it("2.2-UNIT-001: devrait accepter un patient sans email (optionnel)", () => {
    const withoutEmail = {
      lastName: "Dupont",
      firstName: "Marie",
      phone: "0698765432",
    };
    const result = patientSchema.safeParse(withoutEmail);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
    }
  });

  it("2.2-UNIT-002: devrait rejeter nom avec moins de 2 caractères", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      lastName: "M",
    });
    expect(result.success).toBe(false);
  });

  it("2.2-UNIT-002: devrait rejeter prénom avec moins de 2 caractères", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      firstName: "J",
    });
    expect(result.success).toBe(false);
  });

  it("2.2-UNIT-002: devrait accepter nom et prénom avec exactement 2 caractères", () => {
    const result = patientSchema.safeParse({
      lastName: "Li",
      firstName: "Jo",
      phone: "0612345678",
    });
    expect(result.success).toBe(true);
  });

  it("2.2-UNIT-003: devrait valider le téléphone à 10 chiffres", () => {
    const result = patientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("0612345678");
    }
  });

  it("2.2-UNIT-003: devrait rejeter le téléphone avec moins de 10 chiffres", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      phone: "061234567",
    });
    expect(result.success).toBe(false);
  });

  it("2.2-UNIT-003: devrait rejeter le téléphone avec des caractères non numériques", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      phone: "06 12 34 56 78",
    });
    expect(result.success).toBe(false);
  });

  it("2.2-UNIT-004: devrait accepter email vide comme optionnel", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
    }
  });

  it("2.2-UNIT-005: devrait rejeter un email invalide si fourni", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      email: "pas-un-email",
    });
    expect(result.success).toBe(false);
  });

  it("2.2-UNIT-005: devrait rejeter un email sans domaine", () => {
    const result = patientSchema.safeParse({
      ...validPatient,
      email: "jean@",
    });
    expect(result.success).toBe(false);
  });

  it("devrait trimmer les espaces sur les champs texte", () => {
    const result = patientSchema.safeParse({
      lastName: "  Martin  ",
      firstName: "  Jean  ",
      phone: "0612345678",
      email: " jean@example.com ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastName).toBe("Martin");
      expect(result.data.firstName).toBe("Jean");
      expect(result.data.email).toBe("jean@example.com");
    }
  });
});
