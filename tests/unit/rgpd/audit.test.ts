/**
 * Tests unitaires du module pur d'audit RGPD (story 11.3).
 *
 * Scénarios 11.3-UNIT-001 à 11.3-UNIT-004.
 */

import { describe, it, expect } from "vitest";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_DANGER_ACTIONS,
  AUDIT_LABELS,
  formatPatientLabel,
  type AuditActionType,
} from "@/lib/rgpd/audit";

const ALL_ACTIONS: AuditActionType[] = [
  "PATIENT_EXPORT",
  "PATIENT_ERASURE",
  "CONSENT_GRANTED",
  "CONSENT_REVOKED",
  "CONSENT_RESET",
];

describe("AUDIT_ACTION_LABELS", () => {
  it("11.3-UNIT-001: couvre toutes les actions avec des libellés FR non vides", () => {
    for (const action of ALL_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeDefined();
      expect(AUDIT_ACTION_LABELS[action].length).toBeGreaterThan(0);
    }
    // Aucune clé surnuméraire.
    expect(Object.keys(AUDIT_ACTION_LABELS).sort()).toEqual(
      [...ALL_ACTIONS].sort()
    );
  });

  it("11.3-UNIT-002: l'effacement est marqué comme action « danger »", () => {
    expect(AUDIT_DANGER_ACTIONS.has("PATIENT_ERASURE")).toBe(true);
    expect(AUDIT_DANGER_ACTIONS.has("PATIENT_EXPORT")).toBe(false);
    expect(AUDIT_DANGER_ACTIONS.has("CONSENT_GRANTED")).toBe(false);
  });
});

describe("formatPatientLabel", () => {
  it("11.3-UNIT-003: compose et trim « prénom nom »", () => {
    expect(formatPatientLabel({ firstName: "Jean", lastName: "Martin" })).toBe(
      "Jean Martin"
    );
    expect(
      formatPatientLabel({ firstName: "  Jean  ", lastName: "  Martin " })
    ).toBe("Jean Martin");
  });

  it("11.3-UNIT-004: replie sur « Patient » si le nom est vide/absent", () => {
    expect(formatPatientLabel({ firstName: "", lastName: "" })).toBe("Patient");
    expect(formatPatientLabel({})).toBe("Patient");
    expect(
      formatPatientLabel({ firstName: null, lastName: null })
    ).toBe("Patient");
  });
});

describe("AUDIT_LABELS", () => {
  it("11.3-UNIT-005: expose les libellés d'UI nécessaires", () => {
    expect(AUDIT_LABELS.pageTitle.length).toBeGreaterThan(0);
    expect(AUDIT_LABELS.intro.length).toBeGreaterThan(0);
    expect(AUDIT_LABELS.empty.length).toBeGreaterThan(0);
  });
});
