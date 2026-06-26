/**
 * Tests d'intégration : instrumentation d'audit du consentement (story 11.3).
 *
 * Scénarios 11.3-INT-020 à 11.3-INT-023.
 *
 * Vérifie que `setConsentStatus`/`deleteConsentRecord` (11.1) consignent une
 * entrée d'audit best-effort. Harnais + `vi.mock("@/lib/server/audit")`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consentRecord: { upsert: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/audit", () => ({ recordAuditEvent: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/server/audit";
import {
  setConsentStatus,
  deleteConsentRecord,
} from "@/app/dashboard/patients/consent-actions";

const PATIENT_ID = "11111111-1111-4111-8111-111111111111";
const RECORD_ID = "22222222-2222-4222-8222-222222222222";
const mockUser = { id: "user-123", email: "doc@example.com" };

function mockAuthed() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("setConsentStatus — audit", () => {
  it("11.3-INT-020: accord → audit CONSENT_GRANTED", async () => {
    vi.mocked(prisma.consentRecord.upsert).mockResolvedValue({
      id: RECORD_ID,
      patientId: PATIENT_ID,
      type: "HEALTH_DATA",
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      policyVersion: "2026-06",
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await setConsentStatus(PATIENT_ID, {
      type: "HEALTH_DATA",
      granted: true,
    });

    expect(result.success).toBe(true);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONSENT_GRANTED",
        actorId: "user-123",
        patientId: PATIENT_ID,
      })
    );
  });

  it("11.3-INT-021: retrait → audit CONSENT_REVOKED", async () => {
    vi.mocked(prisma.consentRecord.upsert).mockResolvedValue({
      id: RECORD_ID,
      patientId: PATIENT_ID,
      type: "COMMUNICATION",
      granted: false,
      grantedAt: null,
      revokedAt: new Date(),
      policyVersion: "2026-06",
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await setConsentStatus(PATIENT_ID, {
      type: "COMMUNICATION",
      granted: false,
    });

    expect(result.success).toBe(true);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CONSENT_REVOKED" })
    );
  });

  it("11.3-INT-022: entrée invalide → pas d'upsert ni d'audit", async () => {
    const result = await setConsentStatus(PATIENT_ID, {
      // type hors enum
      type: "NOPE" as any,
      granted: true,
    });

    expect(result.success).toBe(false);
    expect(prisma.consentRecord.upsert).not.toHaveBeenCalled();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("deleteConsentRecord — audit", () => {
  it("11.3-INT-023: réinitialisation → audit CONSENT_RESET", async () => {
    vi.mocked(prisma.consentRecord.delete).mockResolvedValue({
      id: RECORD_ID,
      patientId: PATIENT_ID,
      type: "DATA_PROCESSING",
    } as any);

    const result = await deleteConsentRecord(RECORD_ID);

    expect(result.success).toBe(true);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONSENT_RESET",
        patientId: PATIENT_ID,
      })
    );
  });
});
