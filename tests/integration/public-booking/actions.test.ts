/**
 * Tests d'intégration pour la Server Action `getAvailableSlots` (Story 4.1).
 *
 * Couverture:
 * - Validation Zod (date dans le passé / au-delà de 90j)
 * - Un RDV CONFIRMED bloque son créneau
 * - Un RDV CANCELLED est ignoré par la requête Prisma (vérification via le `where`)
 * - Un RDV de 45min bloque 2 créneaux consécutifs
 * - Gestion d'erreur DB → `{ error }`
 */

import { addDays, startOfToday } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
    },
    workingHours: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/app/(public)/[cabinet-slug]/book/actions";

const today = startOfToday();

/** Plage par défaut 08:00–18:00 / 30 min (équivalent aux anciens horaires figés). */
const FULL_DAY_RANGE = [
  { startTime: "08:00", endTime: "18:00", slotDuration: 30 },
];

describe("getAvailableSlots (Story 4.1 / refactor 7.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut : journée ouverte 08:00–18:00 / 30 (story 7.1 lit WorkingHours).
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue(
      FULL_DAY_RANGE as never,
    );
  });

  it("refuse une date dans le passé", async () => {
    const past = addDays(today, -1);
    const result = await getAvailableSlots({ date: past });
    expect(result).toHaveProperty("error");
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("refuse une date au-delà de 90 jours", async () => {
    const far = addDays(today, 100);
    const result = await getAvailableSlots({ date: far });
    expect(result).toHaveProperty("error");
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("retourne 20 créneaux pour une journée sans RDV", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    const result = await getAvailableSlots({ date: today });
    expect("slots" in result).toBe(true);
    if ("slots" in result) {
      expect(result.slots).toHaveLength(20);
    }
  });

  it("filtre le créneau 09:00 occupé par un RDV CONFIRMED", async () => {
    const day = addDays(today, 1);
    const apt = {
      startTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0),
      endTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 30),
    };
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([apt] as never);

    const result = await getAvailableSlots({ date: day });
    expect("slots" in result).toBe(true);
    if ("slots" in result) {
      expect(result.slots).toHaveLength(19);
      const blocked = result.slots.some((iso) => {
        const d = new Date(iso);
        return d.getHours() === 9 && d.getMinutes() === 0;
      });
      expect(blocked).toBe(false);
    }
  });

  it("la requête Prisma exclut les RDV CANCELLED via `status: { not: 'CANCELLED' }`", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    const day = addDays(today, 1);
    await getAvailableSlots({ date: day });

    const call = vi.mocked(prisma.appointment.findMany).mock.calls[0][0]!;
    expect(call.where?.status).toEqual({ not: "CANCELLED" });
    // `select` limité aux deux champs strictement nécessaires (pas de PII).
    expect(call.select).toEqual({ startTime: true, endTime: true });
  });

  it("un RDV de 45min bloque 2 créneaux consécutifs", async () => {
    const day = addDays(today, 1);
    const apt = {
      startTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0),
      endTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 45),
    };
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([apt] as never);

    const result = await getAvailableSlots({ date: day });
    expect("slots" in result).toBe(true);
    if ("slots" in result) {
      expect(result.slots).toHaveLength(18);
    }
  });

  it("retourne `{ error }` lorsque Prisma lève une erreur", async () => {
    vi.mocked(prisma.appointment.findMany).mockRejectedValue(
      new Error("DB down"),
    );
    // Silencer console.error pendant ce test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getAvailableSlots({ date: today });
    expect(result).toHaveProperty("error");
    spy.mockRestore();
  });

  // ---- Régression story 7.1 (lecture WorkingHours) -------------------------

  it("7.1 : un jour sans plage active renvoie [] (jour fermé) sans requête RDV", async () => {
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([] as never);
    const day = addDays(today, 1);
    const result = await getAvailableSlots({ date: day });
    expect(result).toEqual({ slots: [] });
    // Court-circuit : pas de requête des rendez-vous si la journée est fermée.
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("7.1 : une plage 09:00–12:00 / 30 produit 6 créneaux", async () => {
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([
      { startTime: "09:00", endTime: "12:00", slotDuration: 30 },
    ] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    const day = addDays(today, 1);
    const result = await getAvailableSlots({ date: day });
    expect("slots" in result).toBe(true);
    if ("slots" in result) {
      expect(result.slots).toHaveLength(6);
    }
  });

  it("7.1 : interroge WorkingHours pour le bon dayOfWeek (actives uniquement)", async () => {
    const day = addDays(today, 1);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    await getAvailableSlots({ date: day });
    const call = vi.mocked(prisma.workingHours.findMany).mock.calls[0][0]!;
    expect(call.where).toEqual({ dayOfWeek: day.getDay(), active: true });
    expect(call.select).toEqual({
      startTime: true,
      endTime: true,
      slotDuration: true,
    });
  });
});
