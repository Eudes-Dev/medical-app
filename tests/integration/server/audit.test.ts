/**
 * Tests d'intégration de la couche d'écriture du journal d'audit (story 11.3).
 *
 * Scénarios 11.3-INT-001 à 11.3-INT-003 (recorder best-effort).
 *
 * Prisma est mocké (aucune base requise).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/server/audit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recordAuditEvent", () => {
  it("11.3-INT-001: insère une entrée avec les bons champs", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await recordAuditEvent({
      action: "PATIENT_EXPORT",
      actorId: "user-1",
      actorEmail: "doc@example.com",
      patientId: "p-1",
      patientLabel: "Jean Martin",
      summary: "Export des données.",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "PATIENT_EXPORT",
        actorId: "user-1",
        actorEmail: "doc@example.com",
        patientId: "p-1",
        patientLabel: "Jean Martin",
        summary: "Export des données.",
      },
    });
  });

  it("11.3-INT-002: normalise les champs optionnels absents en null", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await recordAuditEvent({ action: "CONSENT_RESET", actorId: "user-1" });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "CONSENT_RESET",
        actorId: "user-1",
        actorEmail: null,
        patientId: null,
        patientLabel: null,
        summary: null,
      },
    });
  });

  it("11.3-INT-003: best-effort — ne propage jamais une erreur Prisma", async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error("DB down"));

    // Ne doit pas throw (la promesse résout à undefined).
    await expect(
      recordAuditEvent({ action: "PATIENT_ERASURE", actorId: "user-1" })
    ).resolves.toBeUndefined();
  });
});
