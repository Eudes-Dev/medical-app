/**
 * Tests unitaires du schéma de validation du consentement RGPD (story 11.1).
 *
 * Scénarios 11.1-UNIT-001 à 11.1-UNIT-008.
 */

import { describe, it, expect } from "vitest";
import {
  consentInputSchema,
  CONSENT_TYPES,
  CONSENT_TYPE_LABELS,
  CONSENT_TYPE_DESCRIPTIONS,
  CONSENT_NOTE_MAX_LENGTH,
  CONSENT_POLICY_VERSION,
} from "@/lib/validations/consent";

describe("consentInputSchema", () => {
  it("11.1-UNIT-001: accepte un consentement accordé sans note", () => {
    const result = consentInputSchema.safeParse({
      type: "HEALTH_DATA",
      granted: true,
    });
    expect(result.success).toBe(true);
  });

  it("11.1-UNIT-002: accepte un consentement retiré avec note", () => {
    const result = consentInputSchema.safeParse({
      type: "COMMUNICATION",
      granted: false,
      note: "Retrait demandé par téléphone",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("Retrait demandé par téléphone");
    }
  });

  it("11.1-UNIT-003: refuse une finalité hors enum", () => {
    const result = consentInputSchema.safeParse({
      type: "MARKETING",
      granted: true,
    });
    expect(result.success).toBe(false);
  });

  it("11.1-UNIT-004: refuse une note > 500 caractères", () => {
    const result = consentInputSchema.safeParse({
      type: "DATA_PROCESSING",
      granted: true,
      note: "x".repeat(CONSENT_NOTE_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("11.1-UNIT-005: normalise une note vide en undefined", () => {
    const result = consentInputSchema.safeParse({
      type: "DATA_PROCESSING",
      granted: true,
      note: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeUndefined();
    }
  });

  it("11.1-UNIT-006: exige un booléen pour granted", () => {
    const result = consentInputSchema.safeParse({
      type: "DATA_PROCESSING",
      granted: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("catalogues de consentement", () => {
  it("11.1-UNIT-007: les libellés et descriptions couvrent toutes les finalités", () => {
    for (const type of CONSENT_TYPES) {
      expect(CONSENT_TYPE_LABELS[type]).toBeTruthy();
      expect(CONSENT_TYPE_DESCRIPTIONS[type]).toBeTruthy();
    }
    expect(Object.keys(CONSENT_TYPE_LABELS)).toHaveLength(CONSENT_TYPES.length);
    expect(Object.keys(CONSENT_TYPE_DESCRIPTIONS)).toHaveLength(
      CONSENT_TYPES.length
    );
  });

  it("11.1-UNIT-008: la version de politique est non vide", () => {
    expect(CONSENT_POLICY_VERSION).toBeTruthy();
    expect(typeof CONSENT_POLICY_VERSION).toBe("string");
  });
});
