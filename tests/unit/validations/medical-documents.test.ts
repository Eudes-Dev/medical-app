/**
 * Tests unitaires de validation + chemin des documents médicaux (story 9.2).
 *
 * Scénarios 9.2-UNIT-001 à 9.2-UNIT-009.
 */

import { describe, it, expect } from "vitest";
import {
  medicalDocumentSchema,
  buildMedicalDocumentPath,
  MEDICAL_DOCUMENT_MAX_SIZE_BYTES,
  MEDICAL_DOCUMENT_MAX_FILENAME_LENGTH,
} from "@/lib/validations/medical-documents";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

function validMeta(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "ordonnance.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    category: "PRESCRIPTION",
    ...overrides,
  };
}

describe("medicalDocumentSchema", () => {
  it("9.2-UNIT-001: accepte une métadonnée valide (et trime le nom)", () => {
    const result = medicalDocumentSchema.safeParse(
      validMeta({ fileName: "  ordonnance.pdf  " })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toBe("ordonnance.pdf");
    }
  });

  it("9.2-UNIT-002: refuse un nom de fichier vide", () => {
    expect(
      medicalDocumentSchema.safeParse(validMeta({ fileName: "   " })).success
    ).toBe(false);
  });

  it("9.2-UNIT-003: refuse un nom de fichier trop long", () => {
    const result = medicalDocumentSchema.safeParse(
      validMeta({
        fileName: "a".repeat(MEDICAL_DOCUMENT_MAX_FILENAME_LENGTH + 1),
      })
    );
    expect(result.success).toBe(false);
  });

  it("9.2-UNIT-004: refuse un type MIME hors allowlist", () => {
    expect(
      medicalDocumentSchema.safeParse(
        validMeta({ mimeType: "application/zip" })
      ).success
    ).toBe(false);
  });

  it("9.2-UNIT-005: refuse une taille nulle ou négative", () => {
    expect(
      medicalDocumentSchema.safeParse(validMeta({ sizeBytes: 0 })).success
    ).toBe(false);
    expect(
      medicalDocumentSchema.safeParse(validMeta({ sizeBytes: -1 })).success
    ).toBe(false);
  });

  it("9.2-UNIT-006: refuse une taille au-delà de 10 Mo", () => {
    const result = medicalDocumentSchema.safeParse(
      validMeta({ sizeBytes: MEDICAL_DOCUMENT_MAX_SIZE_BYTES + 1 })
    );
    expect(result.success).toBe(false);
  });

  it("9.2-UNIT-007: refuse une catégorie invalide", () => {
    expect(
      medicalDocumentSchema.safeParse(validMeta({ category: "FOO" })).success
    ).toBe(false);
  });

  it("9.2-UNIT-008: accepte les trois types MIME de l'allowlist", () => {
    for (const mime of ["application/pdf", "image/jpeg", "image/png"]) {
      expect(
        medicalDocumentSchema.safeParse(validMeta({ mimeType: mime })).success
      ).toBe(true);
    }
  });
});

describe("buildMedicalDocumentPath", () => {
  it("9.2-UNIT-009: génère patients/{id}/{uuid}.{ext} avec ext dérivée du mime", () => {
    const pdf = buildMedicalDocumentPath(PATIENT_ID, "application/pdf");
    expect(pdf).toMatch(
      new RegExp(
        `^patients/${PATIENT_ID}/[0-9a-f-]{36}\\.pdf$`
      )
    );

    const jpg = buildMedicalDocumentPath(PATIENT_ID, "image/jpeg");
    expect(jpg.endsWith(".jpg")).toBe(true);

    const png = buildMedicalDocumentPath(PATIENT_ID, "image/png");
    expect(png.endsWith(".png")).toBe(true);

    // Aucun nom de fichier utilisateur n'entre dans le chemin (anti-traversal).
    expect(pdf.startsWith(`patients/${PATIENT_ID}/`)).toBe(true);
    expect(pdf).not.toContain("..");
  });
});
