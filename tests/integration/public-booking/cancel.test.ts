// @vitest-environment node
/**
 * Tests d'intégration de la route d'annulation publique (story 5.3, CANCEL-ROUTE-001).
 *
 * Couvre la Server Action `cancelByToken` :
 *  - token vide / inconnu ⇒ INVALID (neutre, sans update)
 *  - token valide PENDING ⇒ CANCELLED + email + revalidatePath
 *  - déjà CANCELLED ⇒ succès idempotent (pas d'update, pas d'email)
 *  - pas d'email patient ⇒ pas d'envoi
 *  - rate-limiting par IP
 *
 * + AC 9 : les liens email/SMS pointent vers une route **existante**.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.30" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/send-cancellation", () => ({
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendCancellationEmail } from "@/lib/email/send-cancellation";
import { cancelByToken } from "@/app/(public)/[cabinet-slug]/book/cancel/actions";
import { __resetRateLimit } from "@/lib/server/rate-limit";

const TOKEN = "11111111-1111-4111-8111-111111111111";

const appointmentFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "apt-1",
  status: "PENDING",
  startTime: new Date("2026-06-01T08:00:00Z"),
  type: "Première consultation",
  patient: { firstName: "Jean", email: "jean@example.com" },
  ...overrides,
});

describe("cancelByToken (story 5.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimit();
  });

  it("token vide ⇒ INVALID sans toucher la base", async () => {
    const result = await cancelByToken("");
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.findUnique).not.toHaveBeenCalled();
  });

  it("token inconnu ⇒ INVALID (neutre, pas d'update)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null as never);
    const result = await cancelByToken(TOKEN);
    expect(result).toEqual({ error: "INVALID" });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("token valide PENDING ⇒ CANCELLED + email + revalidatePath", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture() as never,
    );
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);

    const result = await cancelByToken(TOKEN);

    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "apt-1" },
      data: { status: "CANCELLED" },
    });
    expect(sendCancellationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: "apt-1",
        patientEmail: "jean@example.com",
        patientFirstName: "Jean",
        appointmentType: "Première consultation",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/calendar");
  });

  it("déjà CANCELLED ⇒ succès idempotent (pas d'update, pas d'email)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({ status: "CANCELLED" }) as never,
    );

    const result = await cancelByToken(TOKEN);

    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(sendCancellationEmail).not.toHaveBeenCalled();
  });

  it("RDV sans email patient ⇒ annulé sans envoi d'email", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      appointmentFixture({ patient: { firstName: "Jean", email: null } }) as never,
    );
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);

    const result = await cancelByToken(TOKEN);

    expect(result).toEqual({ success: true });
    expect(prisma.appointment.update).toHaveBeenCalled();
    expect(sendCancellationEmail).not.toHaveBeenCalled();
  });

  it("erreur DB ⇒ SERVER (pas de fuite)", async () => {
    vi.mocked(prisma.appointment.findUnique).mockRejectedValue(
      new Error("connection refused [internal:5432]"),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await cancelByToken(TOKEN);
    expect(result).toEqual({ error: "SERVER" });
    expect(Object.keys(result)).not.toContain("message");
    spy.mockRestore();
  });

  it("au-delà de 10 tentatives/10 min/IP ⇒ RATE_LIMITED", async () => {
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null as never);
    for (let i = 0; i < 10; i++) {
      expect(await cancelByToken(TOKEN)).toEqual({ error: "INVALID" });
    }
    expect(await cancelByToken(TOKEN)).toEqual({ error: "RATE_LIMITED" });
  });
});

describe("AC 9 : les liens email/SMS résolvent vers la route d'annulation", () => {
  it("le chemin `/book/cancel` correspond à un fichier de route existant", () => {
    // Les liens sont construits comme `${appUrl}/${slug}/book/cancel?token=...`
    // (lib/email/templates/ConfirmationEmail.tsx + lib/sms/send-confirmation-sms.ts).
    const routeFile = resolve(
      process.cwd(),
      "app/(public)/[cabinet-slug]/book/cancel/page.tsx",
    );
    expect(existsSync(routeFile)).toBe(true);
  });
});
