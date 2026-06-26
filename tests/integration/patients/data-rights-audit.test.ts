/**
 * Tests d'intégration : instrumentation d'audit des droits RGPD (story 11.3).
 *
 * Scénarios 11.3-INT-010 à 11.3-INT-015.
 *
 * Vérifie que `exportPatientData`/`erasePatientData` (11.2) consignent une entrée
 * d'audit best-effort sans changer leur sémantique de retour. Harnais identique à
 * `data-rights-actions.test.ts` + `vi.mock("@/lib/server/audit")`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn(), delete: vi.fn() },
    medicalDocument: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/storage/medical-documents", () => ({ removeObjects: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { removeObjects } from "@/lib/storage/medical-documents";
import { recordAuditEvent } from "@/lib/server/audit";
import {
  exportPatientData,
  erasePatientData,
} from "@/app/dashboard/patients/data-rights-actions";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const mockUser = { id: "user-123", email: "doc@example.com" };

function mockAuthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
  } as any);
}

function mockUnauthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  } as any);
}

function makePatient() {
  const d = new Date("2026-01-01T10:00:00Z");
  return {
    id: PATIENT_ID,
    firstName: "Jean",
    lastName: "Martin",
    phone: "0612345678",
    email: null,
    dateOfBirth: null,
    notes: null,
    reminderOptOut: false,
    createdAt: d,
    updatedAt: d,
    appointments: [],
    consultationNotes: [],
    medicalHistoryEntries: [],
    consentRecords: [],
    medicalDocuments: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("exportPatientData — audit", () => {
  it("11.3-INT-010: export réussi → audit PATIENT_EXPORT avec patient + acteur", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(makePatient() as any);

    const result = await exportPatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    expect(recordAuditEvent).toHaveBeenCalledTimes(1);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PATIENT_EXPORT",
        actorId: "user-123",
        actorEmail: "doc@example.com",
        patientId: PATIENT_ID,
        patientLabel: "Jean Martin",
      })
    );
  });

  it("11.3-INT-011: non authentifié → aucun audit", async () => {
    mockUnauthed();
    await exportPatientData(PATIENT_ID);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("11.3-INT-012: patient introuvable → aucun audit", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null as any);
    await exportPatientData(PATIENT_ID);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("erasePatientData — audit", () => {
  it("11.3-INT-013: effacement réussi → label capturé AVANT delete + audit PATIENT_ERASURE", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      firstName: "Jean",
      lastName: "Martin",
    } as any);
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([
      { storagePath: "patients/x/a.pdf" },
    ] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockResolvedValue({ id: PATIENT_ID } as any);

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    // Le label vient du findUnique appelé avant la suppression.
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({
      where: { id: PATIENT_ID },
      select: { firstName: true, lastName: true },
    });
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PATIENT_ERASURE",
        actorId: "user-123",
        patientId: PATIENT_ID,
        patientLabel: "Jean Martin",
      })
    );
    // L'audit est enregistré après une suppression réussie.
    expect(prisma.patient.delete).toHaveBeenCalled();
  });

  it("11.3-INT-014: le résumé d'audit reflète le nombre de documents purgés", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      firstName: "Jean",
      lastName: "Martin",
    } as any);
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([
      { storagePath: "patients/x/a.pdf" },
      { storagePath: "patients/x/b.pdf" },
    ] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockResolvedValue({ id: PATIENT_ID } as any);

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    // Le best-effort réel (recorder qui ne lève jamais) est couvert par
    // tests/integration/server/audit.test.ts (11.3-INT-003).
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PATIENT_ERASURE",
        summary: expect.stringContaining("2 document"),
      })
    );
  });

  it("11.3-INT-015: échec de suppression (patient introuvable) → aucun audit d'effacement", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null as any);
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockRejectedValue(
      new Error("Record to delete does not exist")
    );

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(false);
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});
