/**
 * Tests unitaires du module pur d'export RGPD (story 11.2).
 *
 * Scénarios 11.2-UNIT-001 à 11.2-UNIT-008. Aucun mock requis : le module est pur
 * (pas de Prisma/Supabase).
 */

import { describe, it, expect } from "vitest";
import {
  buildPatientExport,
  buildPatientExportFileName,
  PATIENT_EXPORT_SCHEMA_VERSION,
  type PatientExportInput,
} from "@/lib/rgpd/patient-export";
import { CONSENT_POLICY_VERSION } from "@/lib/validations/consent";

const D = (s: string) => new Date(s);

function makeInput(overrides: Partial<PatientExportInput> = {}): PatientExportInput {
  return {
    patient: {
      id: "p1",
      firstName: "Jean",
      lastName: "Martin",
      phone: "0612345678",
      email: "jean@example.com",
      dateOfBirth: D("1980-05-15T00:00:00Z"),
      notes: "Note admin",
      reminderOptOut: false,
      createdAt: D("2026-01-01T10:00:00Z"),
      updatedAt: D("2026-02-01T10:00:00Z"),
    },
    appointments: [
      {
        id: "a1",
        startTime: D("2026-03-01T09:00:00Z"),
        endTime: D("2026-03-01T09:30:00Z"),
        status: "CONFIRMED",
        type: "Consultation",
        motif: null,
        modalite: null,
        lieu: null,
        notes: null,
        createdAt: D("2026-02-20T10:00:00Z"),
      },
    ],
    consultationNotes: [
      {
        id: "n1",
        appointmentId: "a1",
        content: "RAS",
        createdAt: D("2026-03-01T09:30:00Z"),
        updatedAt: D("2026-03-01T09:30:00Z"),
      },
    ],
    medicalHistoryEntries: [
      {
        id: "h1",
        category: "ALLERGY",
        content: "Pénicilline",
        createdAt: D("2026-01-05T10:00:00Z"),
        updatedAt: D("2026-01-05T10:00:00Z"),
      },
    ],
    consentRecords: [
      {
        id: "c1",
        type: "HEALTH_DATA",
        granted: true,
        grantedAt: D("2026-01-02T10:00:00Z"),
        revokedAt: null,
        policyVersion: "2026-06",
        note: null,
        createdAt: D("2026-01-02T10:00:00Z"),
        updatedAt: D("2026-01-02T10:00:00Z"),
      },
    ],
    medicalDocuments: [
      {
        id: "d1",
        fileName: "ordonnance.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
        category: "PRESCRIPTION",
        createdAt: D("2026-01-10T10:00:00Z"),
        updatedAt: D("2026-01-10T10:00:00Z"),
      },
    ],
    ...overrides,
  };
}

describe("buildPatientExport", () => {
  it("11.2-UNIT-001: inclut l'en-tête de métadonnées (schemaVersion/exportedAt/policyVersion)", () => {
    const now = D("2026-06-26T12:00:00Z");
    const result = buildPatientExport(makeInput(), { now });
    expect(result.schemaVersion).toBe(PATIENT_EXPORT_SCHEMA_VERSION);
    expect(result.exportedAt).toBe("2026-06-26T12:00:00.000Z");
    expect(result.policyVersion).toBe(CONSENT_POLICY_VERSION);
  });

  it("11.2-UNIT-002: inclut toutes les sections du dossier", () => {
    const result = buildPatientExport(makeInput());
    expect(result.patient.id).toBe("p1");
    expect(result.appointments).toHaveLength(1);
    expect(result.consultationNotes).toHaveLength(1);
    expect(result.medicalHistoryEntries).toHaveLength(1);
    expect(result.consentRecords).toHaveLength(1);
    expect(result.medicalDocuments).toHaveLength(1);
  });

  it("11.2-UNIT-003: n'inclut JAMAIS storagePath dans les documents", () => {
    const result = buildPatientExport(makeInput());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("storagePath");
    expect(serialized).not.toContain("storage_path");
    for (const doc of result.medicalDocuments) {
      expect(doc).not.toHaveProperty("storagePath");
    }
  });

  it("11.2-UNIT-004: sérialise les dates en ISO 8601", () => {
    const result = buildPatientExport(makeInput());
    expect(result.patient.createdAt).toBe("2026-01-01T10:00:00.000Z");
    expect(result.patient.dateOfBirth).toBe("1980-05-15T00:00:00.000Z");
    expect(result.appointments[0].startTime).toBe("2026-03-01T09:00:00.000Z");
    expect(result.consentRecords[0].grantedAt).toBe("2026-01-02T10:00:00.000Z");
    expect(result.consentRecords[0].revokedAt).toBeNull();
  });

  it("11.2-UNIT-005: gère les valeurs nulles optionnelles du patient", () => {
    const input = makeInput();
    input.patient.dateOfBirth = null;
    input.patient.email = null;
    input.patient.notes = null;
    const result = buildPatientExport(input);
    expect(result.patient.dateOfBirth).toBeNull();
    expect(result.patient.email).toBeNull();
    expect(result.patient.notes).toBeNull();
  });

  it("11.2-UNIT-006: tri déterministe des collections par createdAt croissant", () => {
    const input = makeInput({
      appointments: [
        {
          id: "late",
          startTime: D("2026-05-01T09:00:00Z"),
          endTime: D("2026-05-01T09:30:00Z"),
          status: "CONFIRMED",
          type: "B",
          motif: null,
          modalite: null,
          lieu: null,
          notes: null,
          createdAt: D("2026-04-01T10:00:00Z"),
        },
        {
          id: "early",
          startTime: D("2026-03-01T09:00:00Z"),
          endTime: D("2026-03-01T09:30:00Z"),
          status: "CONFIRMED",
          type: "A",
          motif: null,
          modalite: null,
          lieu: null,
          notes: null,
          createdAt: D("2026-02-01T10:00:00Z"),
        },
      ],
    });
    const result = buildPatientExport(input);
    expect(result.appointments.map((a) => a.id)).toEqual(["early", "late"]);
  });

  it("11.2-UNIT-007: produit une sortie entièrement sérialisable JSON", () => {
    const result = buildPatientExport(makeInput());
    expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
  });
});

describe("buildPatientExportFileName", () => {
  it("11.2-UNIT-008: produit un nom de fichier sûr (slug ASCII, .json, anti-traversal)", () => {
    const name = buildPatientExportFileName(
      { firstName: "Élodie", lastName: "Dûpont/Marc" },
      D("2026-06-26T12:00:00Z")
    );
    expect(name).toBe("donnees-patient-dupont-marc-elodie-2026-06-26.json");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("..");
    expect(name.endsWith(".json")).toBe(true);
  });

  it("11.2-UNIT-009: retombe sur « patient » si nom/prénom vides après slug", () => {
    const name = buildPatientExportFileName(
      { firstName: "  ", lastName: "—" },
      D("2026-06-26T12:00:00Z")
    );
    expect(name).toBe("donnees-patient-patient-2026-06-26.json");
  });
});
