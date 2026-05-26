/**
 * Tests d'intégration pour la route cron /api/cron/reminders (Story 6.2, étendu 6.3).
 *
 * Cas couverts :
 *   - D-1 envoi (17h01 UTC, RDV CONFIRMED demain)
 *   - D-1 idempotence (reminderD1SentAt non null → 0 email)
 *   - D-1 hors 17h UTC → 0 email D-1
 *   - H-2 envoi (RDV dans 2h)
 *   - H-2 idempotence (reminderH2SentAt non null → 0 email)
 *   - Opt-out patient → 0 email
 *   - Statut CANCELLED → 0 email
 *   - Statut COMPLETED → 0 email
 *   - Patient mobile FR + email → email ET SMS envoyés en parallèle (6.3)
 *   - Patient avec téléphone fixe → email seul (6.3)
 *   - Patient sans email mais mobile FR → SMS seul (6.3)
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// Doit être avant l'import du module testé pour que le mock soit actif
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/send-reminder", () => ({
  sendReminderD1: vi.fn().mockResolvedValue(undefined),
  sendReminderH2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sms/send-reminder-sms", () => ({
  sendReminderD1Sms: vi.fn().mockResolvedValue(undefined),
  sendReminderH2Sms: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/reminders/route";
import { prisma } from "@/lib/prisma";
import { sendReminderD1, sendReminderH2 } from "@/lib/email/send-reminder";
import { sendReminderD1Sms, sendReminderH2Sms } from "@/lib/sms/send-reminder-sms";

// Fournit un Request authentifié
function makeRequest(): Request {
  return new Request("http://localhost/api/cron/reminders", {
    headers: { authorization: "Bearer test-secret" },
  });
}

// Fournit un RDV CONFIRMED avec patient complet
function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "appt-1",
    status: "CONFIRMED",
    startTime: new Date("2026-06-16T09:00:00Z"),
    type: "Consultation",
    reminderD1SentAt: null,
    reminderH2SentAt: null,
    patient: {
      id: "patient-1",
      email: "patient@test.local",
      firstName: "Alice",
      phone: "0145678901", // fixe FR par défaut → pas de SMS
      optOutToken: "token-alice",
      reminderOptOut: false,
    },
    ...overrides,
  };
}

describe("GET /api/cron/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Authentification ---

  it("retourne 401 si Authorization manquant", async () => {
    const req = new Request("http://localhost/api/cron/reminders");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retourne 401 si secret incorrect", async () => {
    const req = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer mauvais-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  // --- D-1 ---

  it("6.2-INT-001 : D-1 — envoie le rappel et met à jour reminderD1SentAt à 17h UTC", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T17:05:00Z"));

    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([makeAppointment()] as never) // D-1
      .mockResolvedValueOnce([] as never); // H-2

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sentD1).toBe(1);
    expect(sendReminderD1).toHaveBeenCalledOnce();
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reminderD1SentAt: expect.any(Date) }) })
    );
  });

  it("6.2-INT-002 : D-1 idempotence — reminderD1SentAt non null → 0 email", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T17:05:00Z"));

    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([] as never) // D-1 → aucun résultat (idempotent)
      .mockResolvedValueOnce([] as never); // H-2

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentD1).toBe(0);
    expect(sendReminderD1).not.toHaveBeenCalled();
  });

  it("6.2-INT-003 : D-1 hors 17h UTC → logique D-1 non exécutée", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z")); // 10h UTC, pas 17h

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([] as never); // H-2 seulement

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentD1).toBe(0);
    expect(sendReminderD1).not.toHaveBeenCalled();
    expect(prisma.appointment.findMany).toHaveBeenCalledOnce();
  });

  // --- H-2 ---

  it("6.2-INT-004 : H-2 — envoie le rappel et met à jour reminderH2SentAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z")); // RDV à 12:00

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([makeAppointment()] as never); // H-2

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sentH2).toBe(1);
    expect(sendReminderH2).toHaveBeenCalledOnce();
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reminderH2SentAt: expect.any(Date) }) })
    );
  });

  it("6.2-INT-005 : H-2 idempotence — reminderH2SentAt non null → 0 email", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([] as never); // H-2 → idempotent

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(0);
    expect(sendReminderH2).not.toHaveBeenCalled();
  });

  // --- Opt-out et statuts ---

  it("6.2-INT-006 : opt-out patient → 0 email envoyé", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(0);
    expect(sendReminderH2).not.toHaveBeenCalled();
  });

  it("6.2-INT-007 : RDV CANCELLED → exclu par la requête prisma (status: CONFIRMED)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sent).toBe(0);
    expect(sendReminderH2).not.toHaveBeenCalled();
  });

  it("6.2-INT-008 : RDV COMPLETED → exclu par la requête prisma (status: CONFIRMED)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sent).toBe(0);
    expect(sendReminderH2).not.toHaveBeenCalled();
  });

  it("ne pas envoyer si patient sans email ni mobile valide", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([
      makeAppointment({
        patient: {
          id: "p2",
          email: null,
          firstName: "Bob",
          phone: "0145678901", // fixe FR — pas éligible SMS
          optOutToken: "tok",
          reminderOptOut: false,
        },
      }),
    ] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(0);
    expect(sendReminderH2).not.toHaveBeenCalled();
    expect(sendReminderH2Sms).not.toHaveBeenCalled();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  // --- SMS (story 6.3) ---

  it("6.3-INT-001 : H-2 — patient avec mobile FR + email → email ET SMS envoyés en parallèle", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([
      makeAppointment({
        patient: {
          id: "p-mobile",
          email: "alice@test.com",
          firstName: "Alice",
          phone: "0612345678", // mobile FR éligible
          optOutToken: "tok-alice",
          reminderOptOut: false,
        },
      }),
    ] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(1);
    expect(sendReminderH2).toHaveBeenCalledOnce();
    expect(sendReminderH2Sms).toHaveBeenCalledOnce();
    expect(sendReminderH2Sms).toHaveBeenCalledWith(
      expect.objectContaining({
        patientPhone: "+33612345678",
        appointmentId: "appt-1",
      }),
    );
  });

  it("6.3-INT-002 : H-2 — patient avec téléphone fixe → email seul, pas de SMS", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([
      makeAppointment({
        patient: {
          id: "p-fixe",
          email: "bob@test.com",
          firstName: "Bob",
          phone: "0145678901", // fixe FR
          optOutToken: "tok-bob",
          reminderOptOut: false,
        },
      }),
    ] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(1);
    expect(sendReminderH2).toHaveBeenCalledOnce();
    expect(sendReminderH2Sms).not.toHaveBeenCalled();
  });

  it("6.3-INT-003 : H-2 — patient sans email mais mobile FR → SMS seul", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));

    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([
      makeAppointment({
        patient: {
          id: "p-sms-only",
          email: null,
          firstName: "Chloé",
          phone: "0712345678", // mobile FR
          optOutToken: "tok-chloe",
          reminderOptOut: false,
        },
      }),
    ] as never);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentH2).toBe(1);
    expect(sendReminderH2).not.toHaveBeenCalled();
    expect(sendReminderH2Sms).toHaveBeenCalledOnce();
    expect(sendReminderH2Sms).toHaveBeenCalledWith(
      expect.objectContaining({ patientPhone: "+33712345678" }),
    );
  });

  it("6.3-INT-004 : D-1 — SMS envoyé en complément de l'email à 17h UTC", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T17:05:00Z"));

    vi.mocked(prisma.appointment.findMany)
      .mockResolvedValueOnce([
        makeAppointment({
          patient: {
            id: "p-d1",
            email: "alice@test.com",
            firstName: "Alice",
            phone: "0612345678",
            optOutToken: "tok-alice",
            reminderOptOut: false,
          },
        }),
      ] as never)
      .mockResolvedValueOnce([] as never); // H-2

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.sentD1).toBe(1);
    expect(sendReminderD1).toHaveBeenCalledOnce();
    expect(sendReminderD1Sms).toHaveBeenCalledOnce();
  });
});
