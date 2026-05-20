/**
 * Tests d'intégration pour les Server Actions de gestion des créneaux (Story 3.3).
 *
 * Scénarios: 3.3-INT-001 à 3.3-INT-012
 * AC: 3, 4, 5, 6, 8
 *
 * Couvre:
 * - checkConflict (intersection, exclusion CANCELLED, excludeId)
 * - createAppointment (succès, conflit, revalidatePath)
 * - updateAppointment (modification créneau, conflit avec excludeId)
 * - deleteAppointment
 * - updateAppointmentStatus
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkConflict,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  updateAppointmentStatus,
} from "@/app/dashboard/calendar/actions";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const mockUser = { id: "user-123", email: "doc@example.com" };

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as any);
}

const patientFixture = {
  id: "patient-1",
  firstName: "Jean",
  lastName: "Martin",
};

function appointmentFixture(overrides: Partial<any> = {}) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    patientId: patientFixture.id,
    startTime: new Date("2026-06-01T10:00:00Z"),
    endTime: new Date("2026-06-01T10:30:00Z"),
    status: "PENDING",
    type: "Suivi",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: patientFixture,
    ...overrides,
  };
}

// Une heure future stable pour les schémas qui exigent startTime > now()
function futureDate(offsetMs = 24 * 60 * 60 * 1000) {
  return new Date(Date.now() + offsetMs);
}

describe("Story 3.3 — Gestion des créneaux", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  // -------------------------------------------------------------------------
  // checkConflict (AC4)
  // -------------------------------------------------------------------------

  describe("checkConflict", () => {
    it("3.3-INT-002: pas de RDV sur le créneau → hasConflict false", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

      const result = await checkConflict(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z")
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingAppointment).toBeUndefined();
      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          status: { not: "CANCELLED" },
          startTime: { lt: new Date("2026-06-01T10:30:00Z") },
          endTime: { gt: new Date("2026-06-01T10:00:00Z") },
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    it("3.3-INT-003: RDV existant identique → hasConflict true avec patient", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(
        appointmentFixture() as any
      );

      const result = await checkConflict(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z")
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingAppointment).toBeDefined();
      expect(result.conflictingAppointment!.patient.firstName).toBe("Jean");
      expect(result.conflictingAppointment!.patient.lastName).toBe("Martin");
    });

    it("3.3-INT-004: chevauchement partiel (10h15–10h45 sur 10h–10h30) → hasConflict true", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(
        appointmentFixture() as any
      );

      const result = await checkConflict(
        new Date("2026-06-01T10:15:00Z"),
        new Date("2026-06-01T10:45:00Z")
      );

      expect(result.hasConflict).toBe(true);
      // L'action passe bien startTime < newEnd et endTime > newStart à Prisma
      const call = vi.mocked(prisma.appointment.findFirst).mock.calls[0][0]!;
      expect(call.where).toMatchObject({
        startTime: { lt: new Date("2026-06-01T10:45:00Z") },
        endTime: { gt: new Date("2026-06-01T10:15:00Z") },
      });
    });

    it("3.3-INT-005: RDV CANCELLED ignoré → hasConflict false", async () => {
      // Quand la base contient uniquement un RDV CANCELLED, Prisma renverra null
      // parce que le where exclut explicitement `status: { not: "CANCELLED" }`.
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

      const result = await checkConflict(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z")
      );

      expect(result.hasConflict).toBe(false);
      const call = vi.mocked(prisma.appointment.findFirst).mock.calls[0][0]!;
      expect(call.where).toMatchObject({ status: { not: "CANCELLED" } });
    });

    it("checkConflict avec excludeId ajoute la clause id: { not }", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

      await checkConflict(
        new Date("2026-06-01T10:00:00Z"),
        new Date("2026-06-01T10:30:00Z"),
        "55555555-5555-4555-8555-555555555555"
      );

      const call = vi.mocked(prisma.appointment.findFirst).mock.calls[0][0]!;
      expect(call.where).toMatchObject({ id: { not: "55555555-5555-4555-8555-555555555555" } });
    });

    it("checkConflict lève UnauthorizedError si non authentifié", async () => {
      setupAuthMock(false);

      await expect(
        checkConflict(
          new Date("2026-06-01T10:00:00Z"),
          new Date("2026-06-01T10:30:00Z")
        )
      ).rejects.toThrow(UnauthorizedError);
      expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // createAppointment (AC3, AC5, AC6)
  // -------------------------------------------------------------------------

  describe("createAppointment", () => {
    it("3.3-INT-001: données valides → RDV créé en base + revalidatePath", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.appointment.create).mockResolvedValue(
        appointmentFixture({
          startTime: futureDate(),
          endTime: new Date(futureDate().getTime() + 30 * 60 * 1000),
        }) as any
      );

      const start = futureDate();
      const result = await createAppointment({
        patientId: "11111111-1111-1111-1111-111111111111",
        startTime: start,
        duration: 30,
        type: "Suivi",
        notes: "Patient récurrent",
      });

      expect(result.success).toBe(true);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: {
          patientId: "11111111-1111-1111-1111-111111111111",
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60 * 1000),
          type: "Suivi",
          notes: "Patient récurrent",
          status: "PENDING",
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    });

    it("3.3-INT-006: conflit détecté → success false avec nom patient dans l'erreur", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(
        appointmentFixture() as any
      );

      const result = await createAppointment({
        patientId: "11111111-1111-1111-1111-111111111111",
        startTime: futureDate(),
        duration: 30,
        type: "Suivi",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/déjà occupé/i);
        expect(result.error).toMatch(/Jean Martin/);
      }
      expect(prisma.appointment.create).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("3.3-INT-007: succès → retourne success true + revalidatePath calendrier", async () => {
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
      const created = appointmentFixture({ id: "new-apt" });
      vi.mocked(prisma.appointment.create).mockResolvedValue(created as any);

      const result = await createAppointment({
        patientId: "11111111-1111-1111-1111-111111111111",
        startTime: futureDate(),
        duration: 30,
        type: "Première consultation",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.appointment.id).toBe("new-apt");
        expect(result.appointment.patient.firstName).toBe("Jean");
      }
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    });

    it("createAppointment rejette les données invalides (Zod)", async () => {
      const result = await createAppointment({
        patientId: "",
        startTime: futureDate(),
        duration: 30,
        type: "Suivi",
      } as never);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/invalides/i);
      }
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it("createAppointment lève UnauthorizedError si non authentifié", async () => {
      setupAuthMock(false);

      await expect(
        createAppointment({
          patientId: "11111111-1111-1111-1111-111111111111",
          startTime: futureDate(),
          duration: 30,
          type: "Suivi",
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // -------------------------------------------------------------------------
  // updateAppointment (AC8)
  // -------------------------------------------------------------------------

  describe("updateAppointment", () => {
    it("3.3-INT-011: modification de créneau sans conflit → RDV mis à jour, checkConflict appelé avec excludeId", async () => {
      const existing = appointmentFixture();
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
        existing as any
      );
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.appointment.update).mockResolvedValue(
        appointmentFixture({
          startTime: new Date("2026-06-01T11:00:00Z"),
          endTime: new Date("2026-06-01T11:30:00Z"),
        }) as any
      );

      const newStart = new Date("2026-06-01T11:00:00Z");
      const result = await updateAppointment("33333333-3333-4333-8333-333333333333", {
        startTime: newStart,
        duration: 30,
      });

      expect(result.success).toBe(true);
      // checkConflict appelé avec excludeId = "33333333-3333-4333-8333-333333333333"
      const conflictCall = vi.mocked(prisma.appointment.findFirst).mock
        .calls[0][0]!;
      expect(conflictCall.where).toMatchObject({ id: { not: "33333333-3333-4333-8333-333333333333" } });
      // Update appelé avec startTime/endTime recalculés
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "33333333-3333-4333-8333-333333333333" },
          data: expect.objectContaining({
            startTime: newStart,
            endTime: new Date(newStart.getTime() + 30 * 60 * 1000),
          }),
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    });

    it("3.3-INT-012: nouvelle plage en conflit avec un autre RDV → success false", async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
        appointmentFixture() as any
      );
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(
        appointmentFixture({
          id: "44444444-4444-4444-8444-444444444444",
          patient: {
            id: "p2",
            firstName: "Sophie",
            lastName: "Bernard",
          },
        }) as any
      );

      const result = await updateAppointment("33333333-3333-4333-8333-333333333333", {
        startTime: new Date("2026-06-01T11:00:00Z"),
        duration: 30,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/déjà occupé/i);
        expect(result.error).toMatch(/Sophie Bernard/);
      }
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("updateAppointment retourne erreur si RDV introuvable", async () => {
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

      const result = await updateAppointment("66666666-6666-4666-8666-666666666666", { type: "Suivi" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/introuvable/i);
      }
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteAppointment (AC8)
  // -------------------------------------------------------------------------

  describe("deleteAppointment", () => {
    it("3.3-INT-010: supprime le RDV en base + revalidatePath", async () => {
      vi.mocked(prisma.appointment.delete).mockResolvedValue(
        appointmentFixture() as any
      );

      const result = await deleteAppointment("33333333-3333-4333-8333-333333333333");

      expect(result.success).toBe(true);
      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: "33333333-3333-4333-8333-333333333333" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    });

    it("deleteAppointment lève UnauthorizedError si non authentifié", async () => {
      setupAuthMock(false);

      await expect(deleteAppointment("33333333-3333-4333-8333-333333333333")).rejects.toThrow(
        UnauthorizedError
      );
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // updateAppointmentStatus (AC8)
  // -------------------------------------------------------------------------

  describe("updateAppointmentStatus", () => {
    it("3.3-INT-008: PENDING → CONFIRMED met à jour le statut + revalidatePath", async () => {
      vi.mocked(prisma.appointment.update).mockResolvedValue(
        appointmentFixture({ status: "CONFIRMED" }) as any
      );

      const result = await updateAppointmentStatus("33333333-3333-4333-8333-333333333333", "CONFIRMED");

      expect(result.success).toBe(true);
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "33333333-3333-4333-8333-333333333333" },
        data: { status: "CONFIRMED" },
      });
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    });

    it("3.3-INT-009: passage à CANCELLED enregistré en base", async () => {
      vi.mocked(prisma.appointment.update).mockResolvedValue(
        appointmentFixture({ status: "CANCELLED" }) as any
      );

      const result = await updateAppointmentStatus("33333333-3333-4333-8333-333333333333", "CANCELLED");

      expect(result.success).toBe(true);
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "33333333-3333-4333-8333-333333333333" },
        data: { status: "CANCELLED" },
      });
    });

    it("updateAppointmentStatus refuse un statut PENDING (non autorisé)", async () => {
      const result = await updateAppointmentStatus(
        "33333333-3333-4333-8333-333333333333",
        "PENDING" as never
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/invalide/i);
      }
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });
});
