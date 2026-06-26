/**
 * Tests d'intégration — frontière de chiffrement des antécédents médicaux (11.4).
 *
 * Scénarios 11.4-INT-010 à 11.4-INT-013. Même approche que
 * `consultation-note-crypto.test.ts` (mock crypto `ENC:` symétrique).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    medicalHistoryEntry: {
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
  getMedicalHistoryEntries,
  createMedicalHistoryEntry,
  updateMedicalHistoryEntry,
} from "@/app/dashboard/patients/medical-history-actions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { encryptField, decryptField } from "@/lib/security/crypto";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";

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

describe("chiffrement des antécédents médicaux (11.4)", () => {
  it("11.4-INT-010: create chiffre content AVANT Prisma", async () => {
    vi.mocked(prisma.medicalHistoryEntry.create).mockResolvedValue({
      id: ENTRY_ID,
      patientId: PATIENT_ID,
      category: "ALLERGY",
      content: "ENC:Pénicilline",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await createMedicalHistoryEntry(PATIENT_ID, {
      category: "ALLERGY",
      content: "Pénicilline",
    } as any);

    expect(encryptField).toHaveBeenCalledWith("Pénicilline");
    expect(prisma.medicalHistoryEntry.create).toHaveBeenCalledWith({
      data: {
        patientId: PATIENT_ID,
        category: "ALLERGY",
        content: "ENC:Pénicilline",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.entry.content).toBe("Pénicilline");
  });

  it("11.4-INT-011: update chiffre content AVANT Prisma", async () => {
    vi.mocked(prisma.medicalHistoryEntry.update).mockResolvedValue({
      id: ENTRY_ID,
      patientId: PATIENT_ID,
      category: "CURRENT_TREATMENT",
      content: "ENC:Doliprane",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await updateMedicalHistoryEntry(ENTRY_ID, {
      category: "CURRENT_TREATMENT",
      content: "Doliprane",
    } as any);

    expect(encryptField).toHaveBeenCalledWith("Doliprane");
    expect(prisma.medicalHistoryEntry.update).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { category: "CURRENT_TREATMENT", content: "ENC:Doliprane" },
    });
  });

  it("11.4-INT-012: getMedicalHistoryEntries déchiffre content APRÈS lecture", async () => {
    vi.mocked(prisma.medicalHistoryEntry.findMany).mockResolvedValue([
      {
        id: ENTRY_ID,
        patientId: PATIENT_ID,
        category: "ALLERGY",
        content: "ENC:Allergie chiffrée",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const entries = await getMedicalHistoryEntries(PATIENT_ID);

    expect(decryptField).toHaveBeenCalledWith("ENC:Allergie chiffrée");
    expect(entries[0].content).toBe("Allergie chiffrée");
  });

  it("11.4-INT-013: lecture tolérante d'une ligne legacy en clair", async () => {
    vi.mocked(prisma.medicalHistoryEntry.findMany).mockResolvedValue([
      {
        id: ENTRY_ID,
        patientId: PATIENT_ID,
        category: "OTHER",
        content: "Antécédent en clair",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const entries = await getMedicalHistoryEntries(PATIENT_ID);
    expect(entries[0].content).toBe("Antécédent en clair");
  });
});
