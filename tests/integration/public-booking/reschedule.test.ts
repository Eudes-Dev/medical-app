// @vitest-environment node
/**
 * Tests d'intégration de la reprogrammation publique (story 8.1).
 *
 * Couvre la Server Action `rescheduleByToken` :
 *  - token vide / inconnu ⇒ INVALID (neutre, sans update)
 *  - RDV CANCELLED / COMPLETED ⇒ INVALID
 *  - RDV trop proche (< 24h) ⇒ TOO_LATE
 *  - collision sur le nouveau créneau ⇒ SLOT_TAKEN (+ exclusion de soi-même)
 *  - TimeOff actif ⇒ SLOT_TAKEN
 *  - succès ⇒ update (durée conservée) + email fire-and-forget + revalidatePath
 *  - rate-limiting par IP ⇒ RATE_LIMITED
 *  - validation du nouveau créneau (passé / hors horizon) ⇒ INVALID
 *
 * + AC 12 : les liens email/SMS pointent vers des routes **existantes**.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.40" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    timeOff: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/send-reschedule", () => ({
  sendRescheduleEmail: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendRescheduleEmail } from "@/lib/email/send-reschedule";
import { rescheduleByToken } from "@/app/(public)/[cabinet-slug]/book/reschedule/actions";
import { __resetRateLimit } from "@/lib/server/rate-limit";

const TOKEN = "11111111-1111-4111-8111-111111111111";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nouveau créneau valide : 10 jours dans le futur (offset Z accepté). */
const newSlotISO = () => new Date(Date.now() + 10 * DAY_MS).toISOString();

/** RDV courant reprogrammable par défaut : début à +5 j, durée 30 min. */
const appointmentFixture = (overrides: Record<string, unknown> = {}) => {
  const start = new Date(Date.now() + 5 * DAY_MS);
  return {
    id: "apt-1",
    status: "PENDING",
    startTime: start,
    endTime: new Date(start.getTime() + 30 * 60_000),
    type: "Première consultation",
    cancellationToken: TOKEN,
    patient: { firstName: "Jean", email: "jean@example.com" },
    ...overrides,
  };
};

describe("rescheduleByToken (story 8.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimit();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);
  });

  it("token vide ⇒ INVALID sans toucher la base", async () => {
    const result = await rescheduleByToken("", newSlotISO());
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
  });

  it("créneau invalide (passé) ⇒ INVALID sans toucher la base", async () => {
    const past = new Date(Date.now() - DAY_MS).toISOString();
    const result = await rescheduleByToken(TOKEN, past);
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
  });

  it("créneau hors horizon (> 90 j) ⇒ INVALID", async () => {
    const tooFar = new Date(Date.now() + 120 * DAY_MS).toISOString();
    const result = await rescheduleByToken(TOKEN, tooFar);
    expect(result).toEqual({ error: "INVALID" });
  });

  it("token inconnu ⇒ INVALID (neutre, pas d'update)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null as never);
    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("RDV CANCELLED ⇒ INVALID", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({ status: "CANCELLED" }) as never,
    );
    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("RDV COMPLETED ⇒ INVALID", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({ status: "COMPLETED" }) as never,
    );
    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ error: "INVALID" });
  });

  it("RDV trop proche (< 24h) ⇒ TOO_LATE", async () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
      }) as never,
    );
    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ error: "TOO_LATE" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("collision sur le nouveau créneau ⇒ SLOT_TAKEN", async () => {
    const slot = newSlotISO();
    const slotDate = new Date(slot);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture() as never,
    );
    // Un RDV existant chevauche exactement le nouveau créneau.
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        startTime: slotDate,
        endTime: new Date(slotDate.getTime() + 30 * 60_000),
      },
    ] as never);

    const result = await rescheduleByToken(TOKEN, slot);
    expect(result).toEqual({ error: "SLOT_TAKEN" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("exclut le RDV courant de l'anti-collision (pas de conflit avec soi-même)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture() as never,
    );
    await rescheduleByToken(TOKEN, newSlotISO());
    // La requête d'anti-collision doit exclure l'id du RDV courant.
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "apt-1" } }),
      }),
    );
  });

  it("TimeOff actif couvrant le créneau ⇒ SLOT_TAKEN", async () => {
    const slot = newSlotISO();
    const slotDate = new Date(slot);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture() as never,
    );
    // Exception journée entière couvrant le jour du nouveau créneau.
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([
      {
        startDate: slotDate,
        endDate: slotDate,
        allDay: true,
        startTime: null,
        endTime: null,
      },
    ] as never);

    const result = await rescheduleByToken(TOKEN, slot);
    expect(result).toEqual({ error: "SLOT_TAKEN" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("succès ⇒ update (durée conservée) + email + revalidatePath", async () => {
    const slot = newSlotISO();
    const slotDate = new Date(slot);
    const start = new Date(Date.now() + 5 * DAY_MS);
    // Durée 45 min sur le RDV courant — doit être conservée au déplacement.
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({
        startTime: start,
        endTime: new Date(start.getTime() + 45 * 60_000),
      }) as never,
    );

    const result = await rescheduleByToken(TOKEN, slot);

    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "apt-1" },
      data: {
        startTime: slotDate,
        endTime: new Date(slotDate.getTime() + 45 * 60_000),
      },
    });
    expect(sendRescheduleEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: "apt-1",
        patientEmail: "jean@example.com",
        patientFirstName: "Jean",
        appointmentType: "Première consultation",
        cancellationToken: TOKEN,
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
  });

  it("succès sans email patient ⇒ pas d'envoi d'email", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({
        patient: { firstName: "Jean", email: null },
      }) as never,
    );

    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalled();
    expect(sendRescheduleEmail).not.toHaveBeenCalled();
  });

  it("erreur DB ⇒ SERVER (pas de fuite)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockRejectedValue(
      new Error("connection refused [internal:5432]"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await rescheduleByToken(TOKEN, newSlotISO());
    expect(result).toEqual({ error: "SERVER" });
    expect(Object.keys(result)).not.toContain("message");
    spy.mockRestore();
  });

  it("au-delà de 10 tentatives/10 min/IP ⇒ RATE_LIMITED", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null as never);
    const slot = newSlotISO();
    for (let i = 0; i < 10; i++) {
      expect(await rescheduleByToken(TOKEN, slot)).toEqual({ error: "INVALID" });
    }
    expect(await rescheduleByToken(TOKEN, slot)).toEqual({ error: "RATE_LIMITED" });
  });
});

describe("AC 12 : les liens email/SMS résolvent vers des routes existantes", () => {
  it("la route `/book/reschedule` existe (lien email de confirmation/reprogrammation)", () => {
    const routeFile = resolve(
      process.cwd(),
      "app/(public)/[cabinet-slug]/book/reschedule/page.tsx",
    );
    expect(existsSync(routeFile)).toBe(true);
  });

  it("la route `/book/cancel` existe (hub de gestion ciblé par le SMS)", () => {
    const routeFile = resolve(
      process.cwd(),
      "app/(public)/[cabinet-slug]/book/cancel/page.tsx",
    );
    expect(existsSync(routeFile)).toBe(true);
  });
});
