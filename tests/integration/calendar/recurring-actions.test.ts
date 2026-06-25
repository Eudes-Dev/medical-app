/**
 * Tests d'intégration des Server Actions de série récurrente (Story 8.4, Task 5).
 *
 * Prisma mocké (gabarit `appointment-actions.test.ts`). Couvre :
 * - `createRecurringAppointments` : N RDV avec le **même** seriesId quand tout
 *   est libre ; ignore les occurrences en conflit + résumé `{created, skipped,
 *   skippedDates}` cohérent ; `success:false` si **toutes** en conflit (rien
 *   inséré) ; `requireUser` appliqué.
 * - `cancelAppointmentSeries` / `deleteAppointmentSeries` : ne ciblent que
 *   `seriesId` + `startTime >= from` (vérification du `where` Prisma) ; auth.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecurringAppointments,
  cancelAppointmentSeries,
  deleteAppointmentSeries,
} from "@/app/dashboard/calendar/actions";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    serviceType: {
      findUnique: vi.fn(),
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
const SERIES_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as any);
}

const patientFixture = { id: "patient-1", firstName: "Jean", lastName: "Martin" };

function futureDate(offsetMs = 24 * 60 * 60 * 1000) {
  return new Date(Date.now() + offsetMs);
}

const validData = () => ({
  patientId: "11111111-1111-1111-1111-111111111111",
  startTime: futureDate(),
  duration: 30 as const,
  type: "Suivi",
});

describe("Story 8.4 — createRecurringAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("crée N RDV avec le même seriesId quand tout est libre (insertion atomique createMany)", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null); // aucun conflit
    vi.mocked(prisma.appointment.createMany).mockResolvedValue({ count: 4 } as any);

    const result = await createRecurringAppointments(validData(), {
      frequency: "weekly",
      occurrences: 4,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.created).toBe(4);
      expect(result.skipped).toBe(0);
      expect(result.skippedDates).toEqual([]);
      expect(result.seriesId).toMatch(/^[0-9a-f-]{36}$/i);
    }
    // Une seule instruction d'insertion (atomique) pour toute la série.
    expect(prisma.appointment.createMany).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(prisma.appointment.createMany).mock.calls[0][0]!
      .data as Array<{ seriesId: string; status: string }>;
    expect(rows).toHaveLength(4);
    // Toutes les occurrences partagent le même seriesId, status PENDING.
    expect(new Set(rows.map((r) => r.seriesId)).size).toBe(1);
    expect(rows.every((r) => r.status === "PENDING")).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
    expect(revalidatePath).toHaveBeenCalledTimes(1); // un seul revalidate
  });

  it("ignore les occurrences en conflit et renvoie un résumé cohérent", async () => {
    // 1ʳᵉ libre, 2ᵉ occupée, 3ᵉ libre.
    vi.mocked(prisma.appointment.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...patientFixture, patient: patientFixture } as any)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.appointment.createMany).mockResolvedValue({ count: 2 } as any);

    const result = await createRecurringAppointments(validData(), {
      frequency: "weekly",
      occurrences: 3,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.created).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.skippedDates).toHaveLength(1);
    }
    // Seules les 2 occurrences libres sont insérées (en un seul createMany).
    expect(prisma.appointment.createMany).toHaveBeenCalledTimes(1);
    const rows = vi.mocked(prisma.appointment.createMany).mock.calls[0][0]!
      .data as unknown[];
    expect(rows).toHaveLength(2);
  });

  it("renvoie success:false (slotTaken) si TOUTES les occurrences sont en conflit (rien inséré)", async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      ...patientFixture,
      patient: patientFixture,
    } as any);

    const result = await createRecurringAppointments(validData(), {
      frequency: "weekly",
      occurrences: 3,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.slotTaken).toBe(true);
    }
    expect(prisma.appointment.createMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejette une récurrence invalide (occurrences hors bornes)", async () => {
    const result = await createRecurringAppointments(validData(), {
      frequency: "weekly",
      occurrences: 1 as never,
    });
    expect(result.success).toBe(false);
    expect(prisma.appointment.createMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      createRecurringAppointments(validData(), { frequency: "weekly", occurrences: 4 }),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.appointment.createMany).not.toHaveBeenCalled();
  });
});

describe("Story 8.4 — cancelAppointmentSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("ne cible que seriesId + startTime >= from, hors CANCELLED/COMPLETED", async () => {
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 3 } as any);
    const from = new Date("2026-06-10T09:00:00Z");

    const result = await cancelAppointmentSeries(SERIES_UUID, from);

    expect(result.success).toBe(true);
    expect(result.affected).toBe(3);
    const call = vi.mocked(prisma.appointment.updateMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({
      seriesId: SERIES_UUID,
      startTime: { gte: from },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    });
    expect(call.data).toMatchObject({ status: "CANCELLED" });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
  });

  it("refuse un seriesId non-UUID (BadRequest)", async () => {
    const result = await cancelAppointmentSeries("pas-un-uuid", new Date());
    expect(result.success).toBe(false);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      cancelAppointmentSeries(SERIES_UUID, new Date()),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });
});

describe("Story 8.4 — deleteAppointmentSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("ne supprime que seriesId + startTime >= from", async () => {
    vi.mocked(prisma.appointment.deleteMany).mockResolvedValue({ count: 2 } as any);
    const from = new Date("2026-06-10T09:00:00Z");

    const result = await deleteAppointmentSeries(SERIES_UUID, from);

    expect(result.success).toBe(true);
    expect(result.affected).toBe(2);
    const call = vi.mocked(prisma.appointment.deleteMany).mock.calls[0][0]!;
    expect(call.where).toMatchObject({
      seriesId: SERIES_UUID,
      startTime: { gte: from },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
  });

  it("refuse un seriesId non-UUID (BadRequest)", async () => {
    const result = await deleteAppointmentSeries("nope", new Date());
    expect(result.success).toBe(false);
    expect(prisma.appointment.deleteMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(
      deleteAppointmentSeries(SERIES_UUID, new Date()),
    ).rejects.toThrow(UnauthorizedError);
    expect(prisma.appointment.deleteMany).not.toHaveBeenCalled();
  });
});
