/**
 * Tests d'intégration de la lecture du journal d'audit (story 11.3).
 *
 * Scénarios 11.3-INT-030 à 11.3-INT-034.
 *
 * Prisma, Supabase mockés (aucune base requise).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
  },
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAuditLogEntries } from "@/app/dashboard/audit/actions";

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

function makeEntry(over: Record<string, unknown> = {}) {
  return {
    id: "e1",
    action: "PATIENT_EXPORT",
    patientId: PATIENT_ID,
    patientLabel: "Jean Martin",
    actorId: "user-123",
    actorEmail: "doc@example.com",
    summary: "Export.",
    createdAt: new Date("2026-06-26T10:00:00Z"),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthed();
});

describe("getAuditLogEntries", () => {
  it("11.3-INT-030: non authentifié → lève (pas d'appel Prisma)", async () => {
    mockUnauthed();
    await expect(getAuditLogEntries()).rejects.toThrow();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("11.3-INT-031: succès → findMany trié desc + take borné, mapping correct", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([makeEntry()] as any);

    const result = await getAuditLogEntries();

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "e1",
      action: "PATIENT_EXPORT",
      patientLabel: "Jean Martin",
      actorEmail: "doc@example.com",
    });
  });

  it("11.3-INT-032: filtre patient valide → where.patientId", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

    await getAuditLogEntries({ patientId: PATIENT_ID });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });

  it("11.3-INT-033: patientId invalide → [] sans appel Prisma", async () => {
    const result = await getAuditLogEntries({ patientId: "not-a-uuid" });
    expect(result).toEqual([]);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("11.3-INT-034: limit borné au maximum (500)", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as any);

    await getAuditLogEntries({ limit: 99999 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  });
});
