/**
 * Tests d'intégration des Server Actions d'antécédents médicaux (story 9.3).
 *
 * Scénarios 9.3-INT-001 à 9.3-INT-012.
 *
 * Prisma et Supabase sont mockés (aucune base requise) — même harnais que
 * `tests/integration/patients/consultation-notes-actions.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getMedicalHistoryEntries,
  createMedicalHistoryEntry,
  updateMedicalHistoryEntry,
  deleteMedicalHistoryEntry,
} from "@/app/dashboard/patients/medical-history-actions";
import { UnauthorizedError } from "@/lib/errors";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma (medicalHistoryEntry: findMany, create, update, delete)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    medicalHistoryEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";
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

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    patientId: PATIENT_ID,
    category: "ALLERGY",
    content: "Pénicilline",
    createdAt: new Date("2026-06-25T10:00:00Z"),
    updatedAt: new Date("2026-06-25T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("getMedicalHistoryEntries", () => {
  it("9.3-INT-001: retourne les entrées triées par createdAt desc", async () => {
    const entries = [
      makeEntry({ id: "e2", createdAt: new Date("2026-06-25T12:00:00Z") }),
      makeEntry({ id: "e1", createdAt: new Date("2026-06-24T12:00:00Z") }),
    ];
    vi.mocked(prisma.medicalHistoryEntry.findMany).mockResolvedValue(
      entries as any
    );

    const result = await getMedicalHistoryEntries(PATIENT_ID);

    expect(prisma.medicalHistoryEntry.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e2");
  });

  it("9.3-INT-002: lève UnauthorizedError si non authentifié", async () => {
    mockUnauthed();
    await expect(getMedicalHistoryEntries(PATIENT_ID)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    expect(prisma.medicalHistoryEntry.findMany).not.toHaveBeenCalled();
  });

  it("9.3-INT-003: retourne [] si UUID invalide (pas d'appel Prisma)", async () => {
    const result = await getMedicalHistoryEntries("not-a-uuid");
    expect(result).toEqual([]);
    expect(prisma.medicalHistoryEntry.findMany).not.toHaveBeenCalled();
  });
});

describe("createMedicalHistoryEntry", () => {
  it("9.3-INT-004: crée l'entrée, revalide le path et retourne success", async () => {
    vi.mocked(prisma.medicalHistoryEntry.create).mockResolvedValue(
      makeEntry() as any
    );

    const result = await createMedicalHistoryEntry(PATIENT_ID, {
      content: "Pénicilline",
      category: "ALLERGY",
    });

    expect(result.success).toBe(true);
    expect(prisma.medicalHistoryEntry.create).toHaveBeenCalledWith({
      data: {
        patientId: PATIENT_ID,
        category: "ALLERGY",
        content: "Pénicilline",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.3-INT-005: refuse un contenu vide sans appeler Prisma", async () => {
    const result = await createMedicalHistoryEntry(PATIENT_ID, {
      content: "  ",
      category: "ALLERGY",
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("9.3-INT-006: refuse une catégorie invalide sans appeler Prisma", async () => {
    const result = await createMedicalHistoryEntry(PATIENT_ID, {
      content: "Texte",
      category: "BAD" as any,
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("9.3-INT-007: échoue (UUID patient invalide) sans appeler Prisma", async () => {
    const result = await createMedicalHistoryEntry("bad", {
      content: "Pénicilline",
      category: "ALLERGY",
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.create).not.toHaveBeenCalled();
  });

  it("9.3-INT-008: échoue proprement si non authentifié", async () => {
    mockUnauthed();
    const result = await createMedicalHistoryEntry(PATIENT_ID, {
      content: "Pénicilline",
      category: "ALLERGY",
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.create).not.toHaveBeenCalled();
  });
});

describe("updateMedicalHistoryEntry", () => {
  it("9.3-INT-009: met à jour l'entrée et revalide le path du patient propriétaire", async () => {
    vi.mocked(prisma.medicalHistoryEntry.update).mockResolvedValue(
      makeEntry({ category: "OTHER", content: "Maj" }) as any
    );

    const result = await updateMedicalHistoryEntry(ENTRY_ID, {
      content: "Maj",
      category: "OTHER",
    });

    expect(result.success).toBe(true);
    expect(prisma.medicalHistoryEntry.update).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { category: "OTHER", content: "Maj" },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.3-INT-010: refuse un contenu invalide sans appeler Prisma", async () => {
    const result = await updateMedicalHistoryEntry(ENTRY_ID, {
      content: "",
      category: "ALLERGY",
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.update).not.toHaveBeenCalled();
  });

  it("9.3-INT-011: échoue (UUID entrée invalide) sans appeler Prisma", async () => {
    const result = await updateMedicalHistoryEntry("bad", {
      content: "Maj",
      category: "ALLERGY",
    });
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.update).not.toHaveBeenCalled();
  });
});

describe("deleteMedicalHistoryEntry", () => {
  it("9.3-INT-012: supprime l'entrée et revalide le path", async () => {
    vi.mocked(prisma.medicalHistoryEntry.delete).mockResolvedValue(
      makeEntry() as any
    );

    const result = await deleteMedicalHistoryEntry(ENTRY_ID);

    expect(result.success).toBe(true);
    expect(prisma.medicalHistoryEntry.delete).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.3-INT-013: échoue (UUID invalide) sans appeler Prisma", async () => {
    const result = await deleteMedicalHistoryEntry("bad");
    expect(result.success).toBe(false);
    expect(prisma.medicalHistoryEntry.delete).not.toHaveBeenCalled();
  });
});
