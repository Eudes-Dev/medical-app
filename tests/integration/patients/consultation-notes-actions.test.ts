/**
 * Tests d'intégration des Server Actions de notes de consultation (story 9.1).
 *
 * Scénarios 9.1-INT-001 à 9.1-INT-012.
 *
 * Prisma et Supabase sont mockés (aucune base requise) — même harnais que
 * `tests/integration/patients/actions.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConsultationNotes,
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
} from "@/app/dashboard/patients/consultation-note-actions";
import { UnauthorizedError } from "@/lib/errors";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma (consultationNote: findMany, create, update, delete)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultationNote: {
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
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
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

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTE_ID,
    patientId: PATIENT_ID,
    appointmentId: null,
    content: "Note clinique",
    createdAt: new Date("2026-06-25T10:00:00Z"),
    updatedAt: new Date("2026-06-25T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("getConsultationNotes", () => {
  it("9.1-INT-001: retourne les notes triées par createdAt desc", async () => {
    const notes = [
      makeNote({ id: "n2", createdAt: new Date("2026-06-25T12:00:00Z") }),
      makeNote({ id: "n1", createdAt: new Date("2026-06-24T12:00:00Z") }),
    ];
    vi.mocked(prisma.consultationNote.findMany).mockResolvedValue(notes as any);

    const result = await getConsultationNotes(PATIENT_ID);

    expect(prisma.consultationNote.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("n2");
  });

  it("9.1-INT-002: lève UnauthorizedError si non authentifié", async () => {
    mockUnauthed();
    await expect(getConsultationNotes(PATIENT_ID)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    expect(prisma.consultationNote.findMany).not.toHaveBeenCalled();
  });

  it("9.1-INT-003: retourne [] si UUID invalide (pas d'appel Prisma)", async () => {
    const result = await getConsultationNotes("not-a-uuid");
    expect(result).toEqual([]);
    expect(prisma.consultationNote.findMany).not.toHaveBeenCalled();
  });
});

describe("createConsultationNote", () => {
  it("9.1-INT-004: crée la note, revalide le path et retourne success", async () => {
    vi.mocked(prisma.consultationNote.create).mockResolvedValue(
      makeNote() as any
    );

    const result = await createConsultationNote(PATIENT_ID, {
      content: "Note clinique",
    });

    expect(result.success).toBe(true);
    expect(prisma.consultationNote.create).toHaveBeenCalledWith({
      data: { patientId: PATIENT_ID, content: "Note clinique", appointmentId: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.1-INT-005: refuse un contenu vide sans appeler Prisma", async () => {
    const result = await createConsultationNote(PATIENT_ID, { content: "  " });
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.create).not.toHaveBeenCalled();
  });

  it("9.1-INT-006: échoue (UUID patient invalide) sans appeler Prisma", async () => {
    const result = await createConsultationNote("bad", {
      content: "Note clinique",
    });
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.create).not.toHaveBeenCalled();
  });

  it("9.1-INT-007: échoue proprement si non authentifié", async () => {
    mockUnauthed();
    const result = await createConsultationNote(PATIENT_ID, {
      content: "Note clinique",
    });
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.create).not.toHaveBeenCalled();
  });
});

describe("updateConsultationNote", () => {
  it("9.1-INT-008: met à jour la note et revalide le path du patient propriétaire", async () => {
    vi.mocked(prisma.consultationNote.update).mockResolvedValue(
      makeNote({ content: "Maj" }) as any
    );

    const result = await updateConsultationNote(NOTE_ID, { content: "Maj" });

    expect(result.success).toBe(true);
    expect(prisma.consultationNote.update).toHaveBeenCalledWith({
      where: { id: NOTE_ID },
      data: { content: "Maj", appointmentId: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.1-INT-009: refuse un contenu invalide sans appeler Prisma", async () => {
    const result = await updateConsultationNote(NOTE_ID, { content: "" });
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.update).not.toHaveBeenCalled();
  });

  it("9.1-INT-010: échoue (UUID note invalide) sans appeler Prisma", async () => {
    const result = await updateConsultationNote("bad", { content: "Maj" });
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.update).not.toHaveBeenCalled();
  });
});

describe("deleteConsultationNote", () => {
  it("9.1-INT-011: supprime la note et revalide le path", async () => {
    vi.mocked(prisma.consultationNote.delete).mockResolvedValue(
      makeNote() as any
    );

    const result = await deleteConsultationNote(NOTE_ID);

    expect(result.success).toBe(true);
    expect(prisma.consultationNote.delete).toHaveBeenCalledWith({
      where: { id: NOTE_ID },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("9.1-INT-012: échoue (UUID invalide) sans appeler Prisma", async () => {
    const result = await deleteConsultationNote("bad");
    expect(result.success).toBe(false);
    expect(prisma.consultationNote.delete).not.toHaveBeenCalled();
  });
});
