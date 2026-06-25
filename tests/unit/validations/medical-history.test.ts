/**
 * Tests unitaires de validation des antécédents médicaux (story 9.3).
 *
 * Scénarios 9.3-UNIT-001 à 9.3-UNIT-006.
 *
 * Module pur (aucune base) : on vérifie le schéma Zod et la cohérence des
 * libellés de catégories.
 */

import { describe, it, expect } from "vitest";
import {
  medicalHistoryEntrySchema,
  MEDICAL_HISTORY_CATEGORIES,
  MEDICAL_HISTORY_CATEGORY_LABELS,
  MEDICAL_HISTORY_CONTENT_MAX_LENGTH,
} from "@/lib/validations/medical-history";

describe("medicalHistoryEntrySchema", () => {
  it("9.3-UNIT-001: accepte un antécédent valide pour chaque catégorie", () => {
    for (const category of MEDICAL_HISTORY_CATEGORIES) {
      const result = medicalHistoryEntrySchema.safeParse({
        content: "Pénicilline",
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("9.3-UNIT-002: refuse un contenu vide (ou seulement des espaces)", () => {
    expect(
      medicalHistoryEntrySchema.safeParse({ content: "   ", category: "ALLERGY" })
        .success
    ).toBe(false);
    expect(
      medicalHistoryEntrySchema.safeParse({ content: "", category: "ALLERGY" })
        .success
    ).toBe(false);
  });

  it("9.3-UNIT-003: refuse un contenu au-delà de la longueur maximale", () => {
    const tooLong = "a".repeat(MEDICAL_HISTORY_CONTENT_MAX_LENGTH + 1);
    const result = medicalHistoryEntrySchema.safeParse({
      content: tooLong,
      category: "OTHER",
    });
    expect(result.success).toBe(false);
  });

  it("9.3-UNIT-004: accepte un contenu à la longueur maximale exacte", () => {
    const exact = "a".repeat(MEDICAL_HISTORY_CONTENT_MAX_LENGTH);
    const result = medicalHistoryEntrySchema.safeParse({
      content: exact,
      category: "OTHER",
    });
    expect(result.success).toBe(true);
  });

  it("9.3-UNIT-005: refuse une catégorie hors enum", () => {
    const result = medicalHistoryEntrySchema.safeParse({
      content: "Texte",
      category: "INVALID_CATEGORY",
    });
    expect(result.success).toBe(false);
  });
});

describe("MEDICAL_HISTORY_CATEGORY_LABELS", () => {
  it("9.3-UNIT-006: fournit un libellé non vide pour chaque catégorie", () => {
    for (const category of MEDICAL_HISTORY_CATEGORIES) {
      const label = MEDICAL_HISTORY_CATEGORY_LABELS[category];
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
    // Aucune clé orpheline : le record couvre exactement les catégories.
    expect(Object.keys(MEDICAL_HISTORY_CATEGORY_LABELS).sort()).toEqual(
      [...MEDICAL_HISTORY_CATEGORIES].sort()
    );
  });
});
