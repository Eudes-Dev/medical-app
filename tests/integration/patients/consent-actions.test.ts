/**
 * Tests d'intégration des Server Actions de consentement RGPD (story 11.1).
 *
 * Scénarios 11.1-INT-001 à 11.1-INT-011.
 *
 * Prisma et Supabase sont mockés (aucune base requise) — même harnais que
 * `tests/integration/patients/medical-history-actions.test.ts`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConsentRecords,
  setConsentStatus,
  deleteConsentRecord,
} from "@/app/dashboard/patients/consent-actions";
import { UnauthorizedError } from "@/lib/errors";
import { CONSENT_POLICY_VERSION } from "@/lib/validations/consent";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma (consentRecord: findMany, upsert, delete)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    consentRecord: {
      findMany: vi.fn(),
      upsert: vi.fn(),
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
const RECORD_ID = "22222222-2222-4222-8222-222222222222";
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

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: RECORD_ID,
    patientId: PATIENT_ID,
    type: "HEALTH_DATA",
    granted: true,
    grantedAt: new Date("2026-06-26T10:00:00Z"),
    revokedAt: null,
    policyVersion: CONSENT_POLICY_VERSION,
    note: null,
    createdAt: new Date("2026-06-26T10:00:00Z"),
    updatedAt: new Date("2026-06-26T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("getConsentRecords", () => {
  it("11.1-INT-001: retourne les consentements du patient", async () => {
    const records = [makeRecord(), makeRecord({ id: "r2", type: "COMMUNICATION" })];
    vi.mocked(prisma.consentRecord.findMany).mockResolvedValue(records as any);

    const result = await getConsentRecords(PATIENT_ID);

    expect(prisma.consentRecord.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
    });
    expect(result).toHaveLength(2);
  });

  it("11.1-INT-002: lève UnauthorizedError si non authentifié", async () => {
    mockUnauthed();
    await expect(getConsentRecords(PATIENT_ID)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    expect(prisma.consentRecord.findMany).not.toHaveBeenCalled();
  });

  it("11.1-INT-003: retourne [] si UUID invalide (pas d'appel Prisma)", async () => {
    const result = await getConsentRecords("not-a-uuid");
    expect(result).toEqual([]);
    expect(prisma.consentRecord.findMany).not.toHaveBeenCalled();
  });
});

describe("setConsentStatus", () => {
  it("11.1-INT-004: accorde — upsert avec grantedAt, revokedAt null et policyVersion", async () => {
    vi.mocked(prisma.consentRecord.upsert).mockResolvedValue(makeRecord() as any);

    const result = await setConsentStatus(PATIENT_ID, {
      type: "HEALTH_DATA",
      granted: true,
    });

    expect(result.success).toBe(true);
    expect(prisma.consentRecord.upsert).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.consentRecord.upsert).mock.calls[0][0] as any;
    expect(arg.where).toEqual({
      patientId_type: { patientId: PATIENT_ID, type: "HEALTH_DATA" },
    });
    expect(arg.create.granted).toBe(true);
    expect(arg.create.grantedAt).toBeInstanceOf(Date);
    expect(arg.create.revokedAt).toBeNull();
    expect(arg.create.policyVersion).toBe(CONSENT_POLICY_VERSION);
    expect(arg.update.granted).toBe(true);
    expect(arg.update.revokedAt).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("11.1-INT-005: retire — upsert avec granted false et revokedAt renseigné", async () => {
    vi.mocked(prisma.consentRecord.upsert).mockResolvedValue(
      makeRecord({ granted: false, revokedAt: new Date() }) as any
    );

    const result = await setConsentStatus(PATIENT_ID, {
      type: "COMMUNICATION",
      granted: false,
      note: "Retrait",
    });

    expect(result.success).toBe(true);
    const arg = vi.mocked(prisma.consentRecord.upsert).mock.calls[0][0] as any;
    expect(arg.update.granted).toBe(false);
    expect(arg.update.revokedAt).toBeInstanceOf(Date);
    expect(arg.update).not.toHaveProperty("grantedAt");
    expect(arg.update.note).toBe("Retrait");
  });

  it("11.1-INT-006: refuse une finalité invalide sans appeler Prisma", async () => {
    const result = await setConsentStatus(PATIENT_ID, {
      type: "MARKETING" as any,
      granted: true,
    });
    expect(result.success).toBe(false);
    expect(prisma.consentRecord.upsert).not.toHaveBeenCalled();
  });

  it("11.1-INT-007: refuse une note > 500 sans appeler Prisma", async () => {
    const result = await setConsentStatus(PATIENT_ID, {
      type: "DATA_PROCESSING",
      granted: true,
      note: "x".repeat(501),
    });
    expect(result.success).toBe(false);
    expect(prisma.consentRecord.upsert).not.toHaveBeenCalled();
  });

  it("11.1-INT-008: échoue (UUID patient invalide) sans appeler Prisma", async () => {
    const result = await setConsentStatus("bad", {
      type: "HEALTH_DATA",
      granted: true,
    });
    expect(result.success).toBe(false);
    expect(prisma.consentRecord.upsert).not.toHaveBeenCalled();
  });

  it("11.1-INT-009: échoue proprement si non authentifié", async () => {
    mockUnauthed();
    const result = await setConsentStatus(PATIENT_ID, {
      type: "HEALTH_DATA",
      granted: true,
    });
    expect(result.success).toBe(false);
    expect(prisma.consentRecord.upsert).not.toHaveBeenCalled();
  });
});

describe("deleteConsentRecord", () => {
  it("11.1-INT-010: supprime la ligne et revalide le path du patient", async () => {
    vi.mocked(prisma.consentRecord.delete).mockResolvedValue(makeRecord() as any);

    const result = await deleteConsentRecord(RECORD_ID);

    expect(result.success).toBe(true);
    expect(prisma.consentRecord.delete).toHaveBeenCalledWith({
      where: { id: RECORD_ID },
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      `/dashboard/patients/${PATIENT_ID}`
    );
  });

  it("11.1-INT-011: échoue (UUID invalide) sans appeler Prisma", async () => {
    const result = await deleteConsentRecord("bad");
    expect(result.success).toBe(false);
    expect(prisma.consentRecord.delete).not.toHaveBeenCalled();
  });
});
