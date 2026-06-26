/**
 * Tests d'intégration — frontière de chiffrement des notes de consultation (11.4).
 *
 * Scénarios 11.4-INT-001 à 11.4-INT-004. Prisma, Supabase, next/cache et la couche
 * de chiffrement `@/lib/security/crypto` sont mockés : on vérifie que `create`/
 * `update` chiffrent `content` AVANT Prisma et que les lectures déchiffrent APRÈS.
 *
 * Le mock crypto utilise un préfixe `ENC:` symétrique trivial pour observer la
 * frontière sans dépendre d'une vraie clé.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultationNote: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptField: vi.fn((x: string) => "ENC:" + x),
  decryptField: vi.fn((x: string) => (x.startsWith("ENC:") ? x.slice(4) : x)),
}));

import {
  getConsultationNotes,
  createConsultationNote,
  updateConsultationNote,
} from "@/app/dashboard/patients/consultation-note-actions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { encryptField, decryptField } from "@/lib/security/crypto";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";

function mockAuthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "u1", email: "p@x.fr" } } }),
    },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("chiffrement des notes de consultation (11.4)", () => {
  it("11.4-INT-001: create chiffre content AVANT Prisma", async () => {
    vi.mocked(prisma.consultationNote.create).mockResolvedValue({
      id: NOTE_ID,
      patientId: PATIENT_ID,
      appointmentId: null,
      content: "ENC:Contenu clinique",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await createConsultationNote(PATIENT_ID, {
      content: "Contenu clinique",
    } as any);

    expect(encryptField).toHaveBeenCalledWith("Contenu clinique");
    expect(prisma.consultationNote.create).toHaveBeenCalledWith({
      data: {
        patientId: PATIENT_ID,
        content: "ENC:Contenu clinique",
        appointmentId: null,
      },
    });
    // Le retour est déchiffré (clair) pour l'appelant.
    expect(result.success).toBe(true);
    if (result.success) expect(result.note.content).toBe("Contenu clinique");
  });

  it("11.4-INT-002: update chiffre content AVANT Prisma", async () => {
    vi.mocked(prisma.consultationNote.update).mockResolvedValue({
      id: NOTE_ID,
      patientId: PATIENT_ID,
      appointmentId: null,
      content: "ENC:Maj",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await updateConsultationNote(NOTE_ID, {
      content: "Maj",
    } as any);

    expect(encryptField).toHaveBeenCalledWith("Maj");
    expect(prisma.consultationNote.update).toHaveBeenCalledWith({
      where: { id: NOTE_ID },
      data: { content: "ENC:Maj", appointmentId: null },
    });
  });

  it("11.4-INT-003: getConsultationNotes déchiffre content APRÈS lecture", async () => {
    vi.mocked(prisma.consultationNote.findMany).mockResolvedValue([
      {
        id: NOTE_ID,
        patientId: PATIENT_ID,
        appointmentId: null,
        content: "ENC:Note chiffrée",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const notes = await getConsultationNotes(PATIENT_ID);

    expect(decryptField).toHaveBeenCalledWith("ENC:Note chiffrée");
    expect(notes[0].content).toBe("Note chiffrée");
  });

  it("11.4-INT-004: lecture tolérante d'une ligne legacy en clair", async () => {
    vi.mocked(prisma.consultationNote.findMany).mockResolvedValue([
      {
        id: NOTE_ID,
        patientId: PATIENT_ID,
        appointmentId: null,
        content: "Ancienne note en clair",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const notes = await getConsultationNotes(PATIENT_ID);
    expect(notes[0].content).toBe("Ancienne note en clair");
  });
});
