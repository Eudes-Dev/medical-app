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

import { addHours } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zonedDayBoundsUtc } from "@/lib/cabinet/timezone";

// Stub Next cookies/headers — la Server Action appelle `setBookingCookie`
// (cookies) et `getClientIp` (headers, story 5.3).
const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => cookieStore.get(n),
    set: (n: string, v: string) => cookieStore.set(n, { value: v }),
    delete: (n: string) => cookieStore.delete(n),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.20" }),
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
    workingHours: {
      findMany: vi.fn(),
    },
    timeOff: {
      findMany: vi.fn(),
    },
    // Story 7.3 : résolution du service public soumis (active && isPublic).
    serviceType: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createGuestBooking } from "@/app/(public)/[cabinet-slug]/book/actions";
import { __resetRateLimit } from "@/lib/server/rate-limit";

const futureSlot = () => {
  // Demain à 10:00 **heure de Paris** (story 5.3, REL-001) : on construit
  // l'instant UTC correspondant au mur 10:00 Paris, indépendamment du fuseau du
  // runner (UTC en CI). Garantit que `zonedMinutes(slot) === 600`.
  const tomorrow = addHours(new Date(), 24);
  const dayStr = formatInTimeZone(tomorrow, "Europe/Paris", "yyyy-MM-dd");
  return fromZonedTime(`${dayStr}T10:00:00`, "Europe/Paris");
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
    __resetRateLimit(); // compteur isolé par test (story 5.3).
    // Story 7.1 : createGuestBooking lit WorkingHours pour la durée du créneau.
    // Par défaut, une plage 08:00–18:00 / 30 couvre le créneau de test (10:00).
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([
      { startTime: "08:00", endTime: "18:00", slotDuration: 30 },
    ] as never);
    // Story 7.2 : aucune exception TimeOff par défaut (défense en profondeur).
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([] as never);
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

  it("requête anti-collision sur les bornes du jour de Paris du créneau, hors CANCELLED", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    const slot = futureSlot();
    await createGuestBooking({ ...validInput(), slotISO: slot.toISOString() });

    // Story 5.3 : les bornes du jour sont calculées en `Europe/Paris` (UTC)
    // et non plus via startOfDay/endOfDay (fuseau serveur).
    const { startUtc, endUtc } = zonedDayBoundsUtc(slot);
    const call = vi.mocked(prisma.appointment.findMany).mock.calls[0][0]!;
    expect(call.where?.status).toEqual({ not: "CANCELLED" });
    expect((call.where?.startTime as { gte: Date; lt: Date }).gte).toEqual(startUtc);
    expect((call.where?.startTime as { gte: Date; lt: Date }).lt).toEqual(endUtc);
    expect(call.select).toEqual({ startTime: true, endTime: true });
  });

  // ---- Régression story 7.1 (durée du créneau = slotDuration de la plage) ----

  it("7.1 : endTime = startTime + slotDuration de la plage contenant le créneau", async () => {
    const slot = futureSlot(); // 10:00
    // Plage de l'après-midi en 45 min couvrant 10:00 ⇒ endTime = 10:45.
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([
      { startTime: "08:00", endTime: "12:00", slotDuration: 45 },
    ] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    await createGuestBooking({ ...validInput(), slotISO: slot.toISOString() });

    const createCall = vi.mocked(prisma.appointment.create).mock.calls[0][0]!;
    const { startTime, endTime } = createCall.data as {
      startTime: Date;
      endTime: Date;
    };
    expect((endTime.getTime() - startTime.getTime()) / 60_000).toBe(45);
  });

  it("7.1 : fallback 30 min si aucune plage ne couvre le créneau choisi", async () => {
    const slot = futureSlot(); // 10:00
    // Plage du matin se terminant à 09:00 ⇒ ne couvre pas 10:00 ⇒ fallback 30.
    vi.mocked(prisma.workingHours.findMany).mockResolvedValue([
      { startTime: "08:00", endTime: "09:00", slotDuration: 60 },
    ] as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    await createGuestBooking({ ...validInput(), slotISO: slot.toISOString() });

    const createCall = vi.mocked(prisma.appointment.create).mock.calls[0][0]!;
    const { startTime, endTime } = createCall.data as {
      startTime: Date;
      endTime: Date;
    };
    expect((endTime.getTime() - startTime.getTime()) / 60_000).toBe(30);
  });

  // ---- Story 7.2 : défense en profondeur via TimeOff -----------------------

  it("7.2 : SLOT_TAKEN si le créneau est dans une exception allDay active", async () => {
    const slot = futureSlot();
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([
      {
        startDate: slot,
        endDate: slot,
        allDay: true,
        startTime: null,
        endTime: null,
      },
    ] as never);

    const result = await createGuestBooking({
      ...validInput(),
      slotISO: slot.toISOString(),
    });
    expect(result).toEqual({ error: "SLOT_TAKEN" });
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it("7.2 : SLOT_TAKEN si le créneau chevauche une exception partielle active", async () => {
    const slot = futureSlot(); // 10:00, 30 min ⇒ 10:00-10:30
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.timeOff.findMany).mockResolvedValue([
      {
        startDate: slot,
        endDate: slot,
        allDay: false,
        startTime: "10:00",
        endTime: "11:00",
      },
    ] as never);

    const result = await createGuestBooking({
      ...validInput(),
      slotISO: slot.toISOString(),
    });
    expect(result).toEqual({ error: "SLOT_TAKEN" });
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  // ---- Story 7.3 : type de soin sélectionné dans le tunnel -----------------

  const PUBLIC_SERVICE_ID = "11111111-1111-4111-8111-111111111111";

  it("7.3 : un serviceTypeId public fixe la durée (durationMin) et le type (label)", async () => {
    const slot = futureSlot(); // 10:00
    vi.mocked(prisma.serviceType.findFirst).mockResolvedValue({
      id: PUBLIC_SERVICE_ID,
      label: "Bilan complet",
      durationMin: 45,
    } as never);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.patient.create).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    const result = await createGuestBooking({
      ...validInput(),
      slotISO: slot.toISOString(),
      serviceTypeId: PUBLIC_SERVICE_ID,
    });

    expect(result).toEqual({ success: true, appointmentId: "a" });
    // La requête de résolution n'accepte que active && isPublic (AC 9).
    const where = vi.mocked(prisma.serviceType.findFirst).mock.calls[0][0]!
      .where as Record<string, unknown>;
    expect(where).toMatchObject({
      id: PUBLIC_SERVICE_ID,
      active: true,
      isPublic: true,
    });
    const createCall = vi.mocked(prisma.appointment.create).mock.calls[0][0]!;
    const data = createCall.data as {
      startTime: Date;
      endTime: Date;
      type: string;
      serviceTypeId?: string;
    };
    expect((data.endTime.getTime() - data.startTime.getTime()) / 60_000).toBe(45);
    expect(data.type).toBe("Bilan complet");
    expect(data.serviceTypeId).toBe(PUBLIC_SERVICE_ID);
  });

  it("7.3 : un serviceTypeId privé/archivé (introuvable) ⇒ VALIDATION", async () => {
    const slot = futureSlot();
    // where active&&isPublic ⇒ un service privé/archivé n'est pas retrouvé.
    vi.mocked(prisma.serviceType.findFirst).mockResolvedValue(null as never);

    const result = await createGuestBooking({
      ...validInput(),
      slotISO: slot.toISOString(),
      serviceTypeId: PUBLIC_SERVICE_ID,
    });

    expect(result).toMatchObject({ error: "VALIDATION" });
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  // ---- Story 5.3 : rate-limiting par IP (SEC-001) --------------------------

  it("5.3 : au-delà de 5 créations/10 min/IP, renvoie { error: 'RATE_LIMITED' }", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a" } as never);

    // 5 créations autorisées, la 6e est bloquée.
    for (let i = 0; i < 5; i++) {
      const r = await createGuestBooking(validInput());
      expect(r).toEqual({ success: true, appointmentId: "a" });
    }
    const blocked = await createGuestBooking(validInput());
    expect(blocked).toEqual({ error: "RATE_LIMITED" });
    // La requête bloquée ne touche pas la base.
    expect(vi.mocked(prisma.appointment.create).mock.calls).toHaveLength(5);
  });
});
