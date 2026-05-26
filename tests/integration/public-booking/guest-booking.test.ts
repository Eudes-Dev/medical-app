// @vitest-environment node
/**
 * Tests d'intégration pour la Server Action `createGuestBooking` (Story 4.2).
 *
 * Couvre :
 *  - Validation Zod (téléphone US ⇒ VALIDATION)
 *  - Anti-collision : créneau pris (CONFIRMED chevauchant) ⇒ SLOT_TAKEN
 *  - Email nouveau ⇒ patient créé + appointment créé
 *  - Email existant (1 match) ⇒ patient réutilisé
 *  - Email existant (2 matches) ⇒ plus ancien (`createdAt asc`) réutilisé
 *  - Erreur DB ⇒ SERVER (pas de fuite)
 *
 * Conformément au pattern existant (`actions.test.ts`), on mocke Prisma —
 * pas d'instance réelle.
 */

import { addHours, startOfDay, endOfDay } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub Next cookies — la Server Action appelle `setBookingCookie`.
const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => cookieStore.get(n),
    set: (n: string, v: string) => cookieStore.set(n, { value: v }),
    delete: (n: string) => cookieStore.delete(n),
  }),
}));

// JWT secret pour `setBookingCookie`.
process.env.JWT_SECRET = "test-secret-with-at-least-32-characters-aaaa";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    patient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createGuestBooking } from "@/app/(public)/[cabinet-slug]/book/actions";

const futureSlot = () => {
  // Demain à 10:00 — sans collision avec startOfDay/endOfDay du même jour.
  const d = addHours(new Date(), 24);
  d.setHours(10, 0, 0, 0);
  return d;
};

const validInput = () => ({
  firstName: "Jean",
  lastName: "Martin",
  phone: "0612345678",
  email: "jean.martin@email.com",
  slotISO: futureSlot().toISOString(),
});

describe("createGuestBooking (Story 4.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
  });

  it("VALIDATION : refuse un téléphone US sans toucher la base", async () => {
    const result = await createGuestBooking({
      ...validInput(),
      phone: "+1 415 555 0100",
    });
    expect(result).toMatchObject({ error: "VALIDATION" });
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it("SLOT_TAKEN : un RDV CONFIRMED chevauchant bloque la création", async () => {
    const slot = futureSlot();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        startTime: slot,
        endTime: new Date(slot.getTime() + 30 * 60_000),
      },
    ] as never);

    const result = await createGuestBooking({
      ...validInput(),
      slotISO: slot.toISOString(),
    });
    expect(result).toEqual({ error: "SLOT_TAKEN" });
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it("crée un nouveau patient si l'email est inconnu", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: "new-patient" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "apt-1" } as never);

    const result = await createGuestBooking(validInput());

    expect(result).toEqual({ success: true, appointmentId: "apt-1" });
    expect(prisma.patient.create).toHaveBeenCalledTimes(1);
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "new-patient",
          status: "PENDING",
          type: "Première consultation",
        }),
      }),
    );
  });

  it("réutilise un patient existant lorsqu'il y a un seul match email", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      id: "patient-existing",
    } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "apt-2" } as never);

    const result = await createGuestBooking(validInput());

    expect(result).toEqual({ success: true, appointmentId: "apt-2" });
    expect(prisma.patient.create).not.toHaveBeenCalled();
    // findFirst doit trier par createdAt asc pour départager les homonymes.
    const findCall = vi.mocked(prisma.patient.findFirst).mock.calls[0][0]!;
    expect(findCall.orderBy).toEqual({ createdAt: "asc" });
    expect(findCall.where).toEqual({ email: "jean.martin@email.com" });
  });

  it("homonymes : Prisma renvoie déjà le plus ancien via orderBy asc", async () => {
    // On simule Prisma : `findFirst` avec `orderBy createdAt asc` renvoie
    // le plus ancien des deux. C'est ce comportement qui garantit l'AC 3.
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      id: "oldest-patient",
    } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "apt-3" } as never);

    const result = await createGuestBooking(validInput());

    expect(result).toEqual({ success: true, appointmentId: "apt-3" });
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ patientId: "oldest-patient" }),
      }),
    );
  });

  it("SERVER : ne fuit aucune information en cas d'erreur DB", async () => {
    vi.mocked(prisma.appointment.findMany).mockRejectedValue(
      new Error("connection refused [internal-host:5432]"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await createGuestBooking(validInput());
    expect(result).toEqual({ error: "SERVER" });
    // Vérifie qu'aucun champ "message" ne fuit.
    expect(Object.keys(result)).not.toContain("message");
    spy.mockRestore();
  });

  it("requête anti-collision sur startOfDay/endOfDay du créneau, hors CANCELLED", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    const slot = futureSlot();
    await createGuestBooking({ ...validInput(), slotISO: slot.toISOString() });

    const call = vi.mocked(prisma.appointment.findMany).mock.calls[0][0]!;
    expect(call.where?.status).toEqual({ not: "CANCELLED" });
    expect((call.where?.startTime as { gte: Date; lt: Date }).gte).toEqual(
      startOfDay(slot),
    );
    expect((call.where?.startTime as { gte: Date; lt: Date }).lt).toEqual(
      endOfDay(slot),
    );
    expect(call.select).toEqual({ startTime: true, endTime: true });
  });
});
