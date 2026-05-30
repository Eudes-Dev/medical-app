/**
 * Tests d'intégration des Server Actions `TimeOff` (story 7.2).
 *
 * Prisma et l'auth Supabase sont mockés (convention `working-hours-actions.test`).
 *
 * Couverture :
 * - `requireUser` ⇒ `UnauthorizedError` quand non-authentifié
 * - `getTimeOffs` matérialise les fériés manquants (idempotent)
 * - `previewTimeOffImpact` liste les RDV impactés (sans écrire)
 * - `createTimeOff` insère + annule + déclenche `sendCancellationEmail` quand
 *   `notifyCancellations=true`
 * - `toggleHoliday` met à jour `active` sur une ligne `HOLIDAY`
 * - `deleteTimeOff` supprime via `delete`
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    timeOff: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/email/send-cancellation", () => ({
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/lib/email/send-cancellation";
import {
  createTimeOff,
  deleteTimeOff,
  getTimeOffs,
  previewTimeOffImpact,
  toggleHoliday,
} from "@/app/dashboard/settings/timeoff/actions";

const mockUser = { id: "user-123", email: "doc@example.com" };

function setupAuthMock(authenticated = true) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? mockUser : null },
      }),
    },
  } as never);
}

describe("getTimeOffs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("matérialise les fériés manquants puis les renvoie séparés par source", async () => {
    // Aucun férié en base ⇒ insertion attendue.
    vi.mocked(prisma.timeOff.findMany)
      .mockResolvedValueOnce([] as never) // findMany dans ensureHolidaysMaterialized
      .mockResolvedValueOnce([] as never) // findMany MANUAL
      .mockResolvedValueOnce([
        {
          id: "h-1",
          startDate: new Date(Date.UTC(2026, 0, 1)),
          endDate: new Date(Date.UTC(2026, 0, 1)),
          allDay: true,
          startTime: null,
          endTime: null,
          reason: "Jour de l'an",
          source: "HOLIDAY",
          active: true,
        },
      ] as never); // findMany HOLIDAY
    vi.mocked(prisma.timeOff.createMany).mockResolvedValue({ count: 11 } as never);

    const data = await getTimeOffs(2026);

    expect(prisma.timeOff.createMany).toHaveBeenCalledTimes(1);
    expect(data.holidays).toHaveLength(1);
    expect(data.holidays[0].source).toBe("HOLIDAY");
  });

  it("est idempotent : si tous les fériés sont déjà en base, n'insère rien", async () => {
    const { computeFrenchHolidays } = await import("@/lib/cabinet/holidays");
    const allExisting = computeFrenchHolidays(2026).map((h) => ({
      startDate: new Date(`${h.date}T00:00:00.000Z`),
    }));
    vi.mocked(prisma.timeOff.findMany)
      .mockResolvedValueOnce(allExisting as never) // ensureHolidaysMaterialized → tous présents
      .mockResolvedValueOnce([] as never) // MANUAL
      .mockResolvedValueOnce([] as never); // HOLIDAY

    await getTimeOffs(2026);
    expect(prisma.timeOff.createMany).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(getTimeOffs(2026)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("previewTimeOffImpact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("rejette une entrée invalide sans appeler Prisma", async () => {
    const res = await previewTimeOffImpact({
      startDate: new Date("2026-07-10"),
      endDate: new Date("2026-07-01"), // antérieur
      allDay: true,
    });
    expect("error" in res).toBe(true);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("retourne tous les RDV trouvés pour une plage allDay", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "a-1",
        startTime: new Date(2026, 6, 2, 9, 0),
        endTime: new Date(2026, 6, 2, 9, 30),
        type: "Consultation",
        patient: {
          firstName: "Jean",
          lastName: "Martin",
          email: "jean@test.fr",
        },
      },
    ] as never);

    const res = await previewTimeOffImpact({
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-05"),
      allDay: true,
    });
    expect("impacted" in res).toBe(true);
    if ("impacted" in res) {
      expect(res.impacted).toHaveLength(1);
      expect(res.impacted[0].patient.email).toBe("jean@test.fr");
    }
  });

  it("filtre par chevauchement horaire pour une plage partielle", async () => {
    const date = new Date(2026, 6, 1);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      // Hors plage (matin)
      {
        id: "a-am",
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
        endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 30),
        type: "Consultation",
        patient: { firstName: "A", lastName: "A", email: null },
      },
      // Dans la plage 12:00-14:00
      {
        id: "a-noon",
        startTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 30),
        endTime: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 13, 0),
        type: "Consultation",
        patient: { firstName: "B", lastName: "B", email: null },
      },
    ] as never);

    const res = await previewTimeOffImpact({
      startDate: date,
      endDate: date,
      allDay: false,
      startTime: "12:00",
      endTime: "14:00",
    });
    expect("impacted" in res).toBe(true);
    if ("impacted" in res) {
      expect(res.impacted.map((a) => a.id)).toEqual(["a-noon"]);
    }
  });
});

describe("createTimeOff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return (fn as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return fn;
    });
  });

  it("crée l'exception sans toucher aux RDV quand notifyCancellations est faux", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "a-1",
        startTime: new Date(2026, 6, 2, 9, 0),
        endTime: new Date(2026, 6, 2, 9, 30),
        type: "Consultation",
        patient: { firstName: "Jean", email: "jean@test.fr" },
      },
    ] as never);
    vi.mocked(prisma.timeOff.create).mockResolvedValue({ id: "t-1" } as never);

    const res = await createTimeOff({
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-05"),
      allDay: true,
    });

    expect(res).toEqual({
      success: true,
      impactedCount: 1,
      notifiedCount: 0,
    });
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    expect(sendCancellationEmail).not.toHaveBeenCalled();
  });

  it("annule les RDV impactés et envoie un email quand notifyCancellations est vrai", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "a-1",
        startTime: new Date(2026, 6, 2, 9, 0),
        endTime: new Date(2026, 6, 2, 9, 30),
        type: "Consultation",
        patient: { firstName: "Jean", email: "jean@test.fr" },
      },
      // Patient sans email → pas d'envoi
      {
        id: "a-2",
        startTime: new Date(2026, 6, 3, 10, 0),
        endTime: new Date(2026, 6, 3, 10, 30),
        type: "Suivi",
        patient: { firstName: "Marie", email: null },
      },
    ] as never);
    vi.mocked(prisma.timeOff.create).mockResolvedValue({ id: "t-1" } as never);
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 2 } as never);

    const res = await createTimeOff(
      {
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        allDay: true,
      },
      { notifyCancellations: true },
    );

    expect(res).toEqual({
      success: true,
      impactedCount: 2,
      notifiedCount: 1,
    });
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a-1", "a-2"] } },
      data: { status: "CANCELLED" },
    });
    expect(sendCancellationEmail).toHaveBeenCalledTimes(1);
    expect(sendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ patientEmail: "jean@test.fr" }),
    );
  });

  it("rejette une entrée invalide sans rien écrire", async () => {
    const res = await createTimeOff({
      startDate: new Date("2026-07-05"),
      endDate: new Date("2026-07-01"),
      allDay: true,
    });
    expect("error" in res).toBe(true);
    expect(prisma.timeOff.create).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non-authentifié", async () => {
    setupAuthMock(false);
    await expect(
      createTimeOff({
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-01"),
        allDay: true,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("toggleHoliday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("met à jour `active` uniquement sur une ligne HOLIDAY", async () => {
    vi.mocked(prisma.timeOff.updateMany).mockResolvedValue({ count: 1 } as never);
    const res = await toggleHoliday(
      "00000000-0000-4000-8000-000000000001",
      false,
    );
    expect(res).toEqual({ success: true });
    expect(prisma.timeOff.updateMany).toHaveBeenCalledWith({
      where: {
        id: "00000000-0000-4000-8000-000000000001",
        source: "HOLIDAY",
      },
      data: { active: false },
    });
  });

  it("renvoie une erreur si l'id n'est pas un UUID", async () => {
    const res = await toggleHoliday("not-a-uuid", true);
    expect("error" in res).toBe(true);
    expect(prisma.timeOff.updateMany).not.toHaveBeenCalled();
  });

  it("renvoie une erreur si l'id n'existe pas (updateMany count=0)", async () => {
    vi.mocked(prisma.timeOff.updateMany).mockResolvedValue({ count: 0 } as never);
    const res = await toggleHoliday(
      "00000000-0000-4000-8000-000000000099",
      true,
    );
    expect("error" in res).toBe(true);
  });
});

describe("deleteTimeOff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("supprime une exception via prisma.timeOff.delete", async () => {
    vi.mocked(prisma.timeOff.delete).mockResolvedValue({} as never);
    const res = await deleteTimeOff("00000000-0000-4000-8000-000000000001");
    expect(res).toEqual({ success: true });
    expect(prisma.timeOff.delete).toHaveBeenCalledWith({
      where: { id: "00000000-0000-4000-8000-000000000001" },
    });
  });

  it("renvoie une erreur si l'id n'est pas un UUID", async () => {
    const res = await deleteTimeOff("invalid");
    expect("error" in res).toBe(true);
    expect(prisma.timeOff.delete).not.toHaveBeenCalled();
  });
});
