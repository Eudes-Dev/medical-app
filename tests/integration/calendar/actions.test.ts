/**
 * Tests d'intégration pour les Server Actions du calendrier (Story 3.2).
 *
 * Scénarios: 3.2-INT-001 à 3.2-INT-008
 * - getAppointmentsByDateRange: plage, patient, filtre showCancelled, auth
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppointmentsByDateRange } from "@/app/dashboard/calendar/actions";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
    },
  },
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const mockUser = { id: "user-123", email: "test@example.com" };

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as any);
}

describe("getAppointmentsByDateRange (Story 3.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("3.2-INT-001: retourne les RDV avec patient pour une plage", async () => {
    const startDate = new Date("2026-01-27T08:00:00Z");
    const endDate = new Date("2026-01-27T20:00:00Z");
    const mockAppointments = [
      {
        id: "apt-1",
        patientId: "p1",
        startTime: new Date("2026-01-27T10:00:00Z"),
        endTime: new Date("2026-01-27T10:30:00Z"),
        status: "CONFIRMED",
        type: "Consultation",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: "p1",
          firstName: "Jean",
          lastName: "Martin",
        },
      },
    ];
    vi.mocked(prisma.appointment.findMany).mockResolvedValue(
      mockAppointments as any
    );

    const result = await getAppointmentsByDateRange(
      startDate,
      endDate,
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0].patient.firstName).toBe("Jean");
    expect(result[0].patient.lastName).toBe("Martin");
    expect(result[0].status).toBe("CONFIRMED");
    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: {
        startTime: { lt: endDate },
        endTime: { gt: startDate },
        status: { not: "CANCELLED" },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: "asc" },
    });
  });

  it("3.2-INT-002: plage semaine appelle findMany avec startTime/endTime corrects", async () => {
    const startDate = new Date("2026-01-20T08:00:00Z");
    const endDate = new Date("2026-01-26T20:00:00Z");
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getAppointmentsByDateRange(startDate, endDate, false);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: { lt: endDate },
          endTime: { gt: startDate },
        }),
      })
    );
  });

  it("3.2-INT-003: plage jour (même jour 8h–20h) retourne les RDV du jour", async () => {
    const startDate = new Date("2026-01-27T08:00:00Z");
    const endDate = new Date("2026-01-27T20:00:00Z");
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getAppointmentsByDateRange(startDate, endDate, false);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: { lt: endDate },
          endTime: { gt: startDate },
        }),
      })
    );
  });

  it("3.2-INT-004: requête filtre par intersection startTime < endDate ET endTime > startDate", async () => {
    const startDate = new Date("2026-01-27T08:00:00Z");
    const endDate = new Date("2026-01-27T20:00:00Z");
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getAppointmentsByDateRange(startDate, endDate, false);

    const call = vi.mocked(prisma.appointment.findMany).mock.calls[0][0];
    expect(call.where).toEqual({
      startTime: { lt: endDate },
      endTime: { gt: startDate },
      status: { not: "CANCELLED" },
    });
  });

  it("3.2-INT-005: inclut patient (firstName, lastName) dans la réponse", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt-1",
        patientId: "p1",
        startTime: new Date("2026-01-27T10:00:00Z"),
        endTime: new Date("2026-01-27T10:30:00Z"),
        status: "PENDING",
        type: "Consultation",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: "p1",
          firstName: "Marie",
          lastName: "Dupont",
        },
      },
    ] as any);

    const result = await getAppointmentsByDateRange(
      new Date("2026-01-27T08:00:00Z"),
      new Date("2026-01-27T20:00:00Z"),
      false
    );

    expect(result[0].patient.firstName).toBe("Marie");
    expect(result[0].patient.lastName).toBe("Dupont");
  });

  it("3.2-INT-006: exclut CANCELLED quand showCancelled false", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getAppointmentsByDateRange(
      new Date("2026-01-27T08:00:00Z"),
      new Date("2026-01-27T20:00:00Z"),
      false
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: "CANCELLED" },
        }),
      })
    );
  });

  it("3.2-INT-007: lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);

    await expect(
      getAppointmentsByDateRange(
        new Date("2026-01-27T08:00:00Z"),
        new Date("2026-01-27T20:00:00Z"),
        false
      )
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("3.2-INT-008: inclut CANCELLED quand showCancelled true", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getAppointmentsByDateRange(
      new Date("2026-01-27T08:00:00Z"),
      new Date("2026-01-27T20:00:00Z"),
      true
    );

    const call = vi.mocked(prisma.appointment.findMany).mock.calls[0][0];
    expect(call.where).not.toHaveProperty("status");
    expect(call.where).toEqual({
      startTime: expect.any(Object),
      endTime: expect.any(Object),
    });
  });
});
