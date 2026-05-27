/**
 * Tests d'intégration des Server Actions d'horaires (story 7.1).
 *
 * Conformément à la convention du projet (cf. calendar/actions.test), Prisma et
 * l'auth Supabase sont mockés.
 *
 * Couverture:
 * - `getWorkingHours` regroupe les lignes par jour et renvoie 7 entrées ordonnées
 * - `saveWorkingHours` remplace le jeu (deleteMany + createMany transactionnels)
 * - `requireUser` ⇒ `UnauthorizedError` si non authentifié
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/errors";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workingHours: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getWorkingHours,
  saveWorkingHours,
} from "@/app/dashboard/settings/schedule/actions";

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

describe("getWorkingHours (Story 7.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
  });

  it("renvoie 7 jours ordonnés et regroupe les plages par jour", async () => {
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotDuration: 30, active: true },
      { dayOfWeek: 1, startTime: "14:00", endTime: "18:00", slotDuration: 30, active: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", slotDuration: 45, active: false },
    ] as never);

    const week = await getWorkingHours();

    expect(week).toHaveLength(7);
    expect(week.map((d) => d.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // Lundi (1) a deux plages, Mercredi (3) une, les autres aucune.
    expect(week[1].ranges).toHaveLength(2);
    expect(week[3].ranges).toHaveLength(1);
    expect(week[3].ranges[0]).toMatchObject({ slotDuration: 45, active: false });
    expect(week[0].ranges).toEqual([]);
    expect(week[6].ranges).toEqual([]);
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(getWorkingHours()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(prisma.workingHours.findMany).not.toHaveBeenCalled();
  });
});

describe("saveWorkingHours (Story 7.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock(true);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
    vi.mocked(prisma.workingHours.deleteMany).mockReturnValue("DELETE" as never);
    vi.mocked(prisma.workingHours.createMany).mockReturnValue("CREATE" as never);
  });

  const validWeek = [
    { dayOfWeek: 0, ranges: [] },
    {
      dayOfWeek: 1,
      ranges: [
        { startTime: "08:00", endTime: "12:00", slotDuration: 30, active: true },
        { startTime: "14:00", endTime: "18:00", slotDuration: 45, active: false },
      ],
    },
    { dayOfWeek: 2, ranges: [] },
    { dayOfWeek: 3, ranges: [] },
    { dayOfWeek: 4, ranges: [] },
    { dayOfWeek: 5, ranges: [] },
    { dayOfWeek: 6, ranges: [] },
  ];

  it("remplace le jeu via deleteMany + createMany dans une transaction", async () => {
    const result = await saveWorkingHours(validWeek);

    expect(result).toEqual({ success: true });
    expect(prisma.workingHours.deleteMany).toHaveBeenCalledWith({});
    // createMany reçoit les plages aplaties (2 lignes du lundi), inactives incluses.
    expect(prisma.workingHours.createMany).toHaveBeenCalledWith({
      data: [
        { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotDuration: 30, active: true },
        { dayOfWeek: 1, startTime: "14:00", endTime: "18:00", slotDuration: 45, active: false },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(["DELETE", "CREATE"]);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings/schedule");
  });

  it("rejette un planning invalide (chevauchement) sans écrire", async () => {
    const overlapping = [
      {
        dayOfWeek: 1,
        ranges: [
          { startTime: "08:00", endTime: "12:30", slotDuration: 30, active: true },
          { startTime: "12:00", endTime: "18:00", slotDuration: 30, active: true },
        ],
      },
    ];
    const result = await saveWorkingHours(overlapping);
    expect("error" in result).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("lève UnauthorizedError si non authentifié", async () => {
    setupAuthMock(false);
    await expect(saveWorkingHours(validWeek)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("renvoie un message générique si la transaction échoue", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await saveWorkingHours(validWeek);
    expect("error" in result).toBe(true);
    spy.mockRestore();
  });
});
