/**
 * Tests d'intégration pour les Server Actions du dashboard
 * 
 * Test IDs: 2.1-INT-001, 2.1-INT-002, 2.1-INT-003
 * Priority: P0, P0, P1
 * Level: Integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDashboardStats } from "@/app/dashboard/actions";
import { UnauthorizedError } from "@/lib/errors";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

describe("getDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("2.1-INT-001: devrait retourner les RDV du jour avec les filtres de date corrects", async () => {
    // Mock utilisateur authentifié
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    } as any);

    // Mock Prisma count pour les RDV du jour
    const mockTodayCount = 5;
    vi.mocked(prisma.appointment.count).mockResolvedValue(mockTodayCount);

    // Mock Prisma findMany pour les prochains RDV
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const result = await getDashboardStats();

    expect(result.todayAppointmentsCount).toBe(mockTodayCount);
    expect(prisma.appointment.count).toHaveBeenCalledWith({
      where: {
        startTime: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
      },
    });

    // Vérifier que les dates sont dans la même journée
    const countCall = vi.mocked(prisma.appointment.count).mock.calls[0][0];
    const startTime = countCall?.where?.startTime;
    if (startTime && startTime.gte && startTime.lte) {
      expect(startTime.gte.getUTCDate()).toBe(new Date().getUTCDate());
      expect(startTime.lte.getUTCDate()).toBe(new Date().getUTCDate());
    }
  });

  it("2.1-INT-002: devrait retourner les 5 prochains RDV triés par startTime croissant", async () => {
    // Mock utilisateur authentifié
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    } as any);

    // Mock Prisma
    vi.mocked(prisma.appointment.count).mockResolvedValue(0);

    const mockUpcomingAppointments = [
      {
        id: "appt-1",
        startTime: new Date("2026-01-30T10:00:00Z"),
        endTime: new Date("2026-01-30T10:30:00Z"),
        status: "CONFIRMED",
        type: "Consultation",
        patient: { firstName: "Jean", lastName: "Martin" },
      },
      {
        id: "appt-2",
        startTime: new Date("2026-01-30T14:00:00Z"),
        endTime: new Date("2026-01-30T14:30:00Z"),
        status: "PENDING",
        type: "Suivi",
        patient: { firstName: "Marie", lastName: "Dupont" },
      },
    ];

    vi.mocked(prisma.appointment.findMany).mockResolvedValue(
      mockUpcomingAppointments as any
    );

    const result = await getDashboardStats();

    expect(result.upcomingAppointments).toHaveLength(2);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith({
      where: {
        startTime: {
          gte: expect.any(Date),
        },
        status: {
          in: ["CONFIRMED", "PENDING"],
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
      take: 5,
    });
  });

  it("2.1-INT-003: devrait filtrer par statut CONFIRMED ou PENDING uniquement", async () => {
    // Mock utilisateur authentifié
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    } as any);

    vi.mocked(prisma.appointment.count).mockResolvedValue(0);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    await getDashboardStats();

    const findManyCall = vi.mocked(prisma.appointment.findMany).mock.calls[0][0];
    expect(findManyCall?.where?.status?.in).toEqual(["CONFIRMED", "PENDING"]);
  });

  it("2.1-INT-010: devrait lever une UnauthorizedError si l'utilisateur n'est pas authentifié", async () => {
    // Mock utilisateur non authentifié
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as any);

    await expect(getDashboardStats()).rejects.toThrow(UnauthorizedError);
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  it("devrait gérer les erreurs Prisma correctement", async () => {
    // Mock utilisateur authentifié
    const mockUser = { id: "user-123", email: "test@example.com" };
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
        }),
      },
    } as any);

    // Mock erreur Prisma
    const prismaError = new Error("Database connection failed");
    vi.mocked(prisma.appointment.count).mockRejectedValue(prismaError);

    await expect(getDashboardStats()).rejects.toThrow(
      "Failed to fetch dashboard statistics"
    );
  });
});
