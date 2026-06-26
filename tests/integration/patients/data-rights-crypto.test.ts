/**
 * Tests d'intégration — export RGPD lisible malgré le chiffrement (11.4).
 *
 * Scénarios 11.4-INT-020 à 11.4-INT-021. `exportPatientData` (11.2) doit
 * DÉCHIFFRER le `content` des notes de consultation et des antécédents avant de
 * construire le JSON, afin que la portabilité (art. 20) reste intelligible.
 *
 * Prisma, Supabase, Storage, audit, next/cache et crypto sont mockés.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn(), delete: vi.fn() },
    medicalDocument: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/storage/medical-documents", () => ({
  removeObjects: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/security/crypto", () => ({
  decryptField: vi.fn((x: string) => (x.startsWith("ENC:") ? x.slice(4) : x)),
}));

import { exportPatientData } from "@/app/dashboard/patients/data-rights-actions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/security/crypto";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";

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

describe("export RGPD avec déchiffrement (11.4)", () => {
  it("11.4-INT-020: le JSON exporté contient le contenu DÉCHIFFRÉ (notes + antécédents)", async () => {
    const d = new Date("2026-01-01T10:00:00Z");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
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
      consultationNotes: [
        {
          id: "n1",
          appointmentId: null,
          content: "ENC:Note clinique secrète",
          createdAt: d,
          updatedAt: d,
        },
      ],
      medicalHistoryEntries: [
        {
          id: "h1",
          category: "ALLERGY",
          content: "ENC:Allergie pénicilline",
          createdAt: d,
          updatedAt: d,
        },
      ],
      consentRecords: [],
      medicalDocuments: [],
    } as any);

    const result = await exportPatientData(PATIENT_ID);

    expect(result.success).toBe(true);
    expect(decryptField).toHaveBeenCalledWith("ENC:Note clinique secrète");
    expect(decryptField).toHaveBeenCalledWith("ENC:Allergie pénicilline");

    if (result.success) {
      const parsed = JSON.parse(result.json);
      expect(parsed.consultationNotes[0].content).toBe("Note clinique secrète");
      expect(parsed.medicalHistoryEntries[0].content).toBe(
        "Allergie pénicilline"
      );
      // Aucune enveloppe chiffrée ne fuit dans l'export.
      expect(result.json).not.toContain("ENC:");
    }
  });

  it("11.4-INT-021: contenus legacy en clair exportés tels quels", async () => {
    const d = new Date("2026-01-01T10:00:00Z");
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
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
      consultationNotes: [
        {
          id: "n1",
          appointmentId: null,
          content: "Note en clair",
          createdAt: d,
          updatedAt: d,
        },
      ],
      medicalHistoryEntries: [],
      consentRecords: [],
      medicalDocuments: [],
    } as any);

    const result = await exportPatientData(PATIENT_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      const parsed = JSON.parse(result.json);
      expect(parsed.consultationNotes[0].content).toBe("Note en clair");
    }
  });
});
