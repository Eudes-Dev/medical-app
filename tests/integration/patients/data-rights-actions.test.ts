/**
 * Tests d'intégration des Server Actions de droits RGPD (story 11.2).
 *
 * Scénarios 11.2-INT-001 à 11.2-INT-011.
 *
 * Prisma, Supabase, Storage et next/cache sont mockés (aucune base/bucket requis)
 * — même harnais que `tests/integration/patients/medical-history-actions.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  exportPatientData,
  erasePatientData,
} from "@/app/dashboard/patients/data-rights-actions";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    medicalDocument: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/medical-documents", () => ({
  removeObjects: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { removeObjects } from "@/lib/storage/medical-documents";
import { revalidatePath } from "next/cache";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const mockUser = { id: "user-123", email: "test@example.com" };

function mockAuthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
  } as any);
}

function mockUnauthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  } as any);
}

function makePatientWithRelations() {
  const d = new Date("2026-01-01T10:00:00Z");
  return {
    id: PATIENT_ID,
    firstName: "Jean",
    lastName: "Martin",
    phone: "0612345678",
    email: "jean@example.com",
    dateOfBirth: null,
    notes: null,
    reminderOptOut: false,
    createdAt: d,
    updatedAt: d,
    appointments: [
      {
        id: "a1",
        startTime: d,
        endTime: d,
        status: "CONFIRMED",
        type: "Consultation",
        motif: null,
        modalite: null,
        lieu: null,
        notes: null,
        createdAt: d,
      },
    ],
    consultationNotes: [],
    medicalHistoryEntries: [],
    consentRecords: [],
    medicalDocuments: [
      {
        id: "doc1",
        fileName: "ordo.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        category: "PRESCRIPTION",
        storagePath: "patients/" + PATIENT_ID + "/x.pdf",
        createdAt: d,
        updatedAt: d,
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("exportPatientData", () => {
  it("11.2-INT-001: échoue proprement si non authentifié (pas d'appel Prisma)", async () => {
    mockUnauthed();
    const result = await exportPatientData(PATIENT_ID);
    expect(result.success).toBe(false);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it("11.2-INT-002: échoue si UUID invalide sans appeler Prisma", async () => {
    const result = await exportPatientData("not-a-uuid");
    expect(result.success).toBe(false);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it("11.2-INT-003: patient introuvable → erreur", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null as any);
    const result = await exportPatientData(PATIENT_ID);
    expect(result.success).toBe(false);
  });

  it("11.2-INT-004: succès → findUnique avec include, json parseable et complet", async () => {
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(
      makePatientWithRelations() as any
    );

    const result = await exportPatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({
      where: { id: PATIENT_ID },
      include: {
        appointments: true,
        consultationNotes: true,
        medicalHistoryEntries: true,
        consentRecords: true,
        medicalDocuments: true,
      },
    });

    if (result.success) {
      expect(result.fileName).toMatch(/^donnees-patient-martin-jean-\d{4}-\d{2}-\d{2}\.json$/);
      const parsed = JSON.parse(result.json);
      expect(parsed.patient.id).toBe(PATIENT_ID);
      expect(parsed.appointments).toHaveLength(1);
      expect(parsed.medicalDocuments).toHaveLength(1);
      // Métadonnées seules : aucun storagePath ne fuit.
      expect(result.json).not.toContain("storagePath");
      expect(result.json).not.toContain("storage_path");
    }
  });
});

describe("erasePatientData", () => {
  it("11.2-INT-005: échoue proprement si non authentifié (aucune suppression)", async () => {
    mockUnauthed();
    const result = await erasePatientData(PATIENT_ID);
    expect(result.success).toBe(false);
    expect(prisma.medicalDocument.findMany).not.toHaveBeenCalled();
    expect(prisma.patient.delete).not.toHaveBeenCalled();
  });

  it("11.2-INT-006: échoue si UUID invalide sans appel Prisma/Storage", async () => {
    const result = await erasePatientData("bad");
    expect(result.success).toBe(false);
    expect(prisma.medicalDocument.findMany).not.toHaveBeenCalled();
    expect(removeObjects).not.toHaveBeenCalled();
    expect(prisma.patient.delete).not.toHaveBeenCalled();
  });

  it("11.2-INT-007: purge le Storage PUIS supprime le patient + revalide", async () => {
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([
      { storagePath: "patients/x/a.pdf" },
      { storagePath: "patients/x/b.pdf" },
    ] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockResolvedValue({ id: PATIENT_ID } as any);

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) expect(result.erasedDocuments).toBe(2);
    expect(prisma.medicalDocument.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
      select: { storagePath: true },
    });
    expect(removeObjects).toHaveBeenCalledWith([
      "patients/x/a.pdf",
      "patients/x/b.pdf",
    ]);
    expect(prisma.patient.delete).toHaveBeenCalledWith({
      where: { id: PATIENT_ID },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/patients");
  });

  it("11.2-INT-008: continue la suppression même si la purge Storage échoue (best-effort)", async () => {
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([
      { storagePath: "patients/x/a.pdf" },
    ] as any);
    vi.mocked(removeObjects).mockRejectedValue(new Error("Storage down"));
    vi.mocked(prisma.patient.delete).mockResolvedValue({ id: PATIENT_ID } as any);

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    expect(prisma.patient.delete).toHaveBeenCalledWith({
      where: { id: PATIENT_ID },
    });
  });

  it("11.2-INT-009: patient sans document → removeObjects appelé avec [] et suppression OK", async () => {
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockResolvedValue({ id: PATIENT_ID } as any);

    const result = await erasePatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    if (result.success) expect(result.erasedDocuments).toBe(0);
    expect(removeObjects).toHaveBeenCalledWith([]);
  });

  it("11.2-INT-010: patient introuvable (delete rejette) → erreur", async () => {
    vi.mocked(prisma.medicalDocument.findMany).mockResolvedValue([] as any);
    vi.mocked(removeObjects).mockResolvedValue(undefined);
    vi.mocked(prisma.patient.delete).mockRejectedValue(
      new Error("Record to delete does not exist")
    );

    const result = await erasePatientData(PATIENT_ID);
    expect(result.success).toBe(false);
  });
});
