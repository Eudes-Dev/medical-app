/**
 * Tests d'intégration de la couche d'accès des statistiques (story 10.1).
 *
 * Test IDs: 10.1-INT-001..004
 * Level: Integration (Prisma + auth mockés — aucune base requise)
 *
 * Vérifie la frontière `getCabinetStatistics` :
 *  - garde `requireUser()` ;
 *  - fenêtre de requête `[prevStart, end]` (couvre courant + précédent) ;
 *  - conversion du `Decimal` `ServiceType.price` en nombre ;
 *  - délégation correcte à la logique pure (résultat agrégé cohérent).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// `analytics-data.ts` est un module `server-only` ; ce marqueur est neutralisé
// par un alias de test (cf. vitest.config.ts → tests/stubs/server-only.ts).

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: { findMany: vi.fn() },
    patient: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/server/auth", () => ({
  requireUser: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { getCabinetStatistics } from "@/app/dashboard/analytics/analytics-data";
import { resolvePeriodRange } from "@/lib/analytics/stats";

const DAY = 86_400_000;

/** Simule une valeur `Decimal` Prisma : objet avec `toString` numérique
 *  (suffisant pour `Number(value)`). */
function decimal(n: number) {
  return { toString: () => String(n), valueOf: () => n };
}

describe("getCabinetStatistics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "doc@cabinet.fr" });
  });

  it("10.1-INT-001: exige une session via requireUser()", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as never);

    await getCabinetStatistics("30d");

    expect(requireUser).toHaveBeenCalledOnce();
  });

  it("10.1-INT-002: interroge Prisma sur la fenêtre [prevStart, end] avec le bon select", async () => {
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as never);

    await getCabinetStatistics("30d");

    const apptArgs = vi.mocked(prisma.appointment.findMany).mock.calls[0][0];
    const startTime = apptArgs?.where?.startTime as { gte: Date; lte: Date };

    // Borne basse = prevStart (≈ 60 jours avant maintenant pour 30d) ; haute = now.
    const { prevStart, end } = resolvePeriodRange("30d", new Date());
    expect(startTime.gte).toBeInstanceOf(Date);
    expect(startTime.lte).toBeInstanceOf(Date);
    // Tolérance : la requête a recalculé `now` (quelques ms d'écart admises).
    expect(Math.abs(startTime.gte.getTime() - prevStart.getTime())).toBeLessThan(5 * DAY);
    expect(Math.abs(startTime.lte.getTime() - end.getTime())).toBeLessThan(60_000);

    // Le select inclut le prix du soin (jointure pour le CA).
    expect(apptArgs?.select).toMatchObject({
      startTime: true,
      status: true,
      type: true,
      serviceType: { select: { price: true } },
    });

    // Les patients sont filtrés sur createdAt dans la même fenêtre.
    const patientArgs = vi.mocked(prisma.patient.findMany).mock.calls[0][0];
    expect(patientArgs?.where?.createdAt).toBeDefined();
    expect(patientArgs?.select).toMatchObject({ createdAt: true });
  });

  it("10.1-INT-003: convertit le Decimal price en nombre et calcule le CA", async () => {
    const recent = new Date(Date.now() - 1 * DAY);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        startTime: recent,
        status: "COMPLETED",
        type: "Consultation",
        serviceType: { price: decimal(80) },
      },
      {
        startTime: recent,
        status: "COMPLETED",
        type: "Suivi",
        serviceType: null, // pas de soin tarifé → price null → 0
      },
    ] as never);
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as never);

    const stats = await getCabinetStatistics("30d");

    expect(stats.revenue.value).toBe(80);
    expect(stats.appointments.total).toBe(2);
    expect(stats.byServiceType).toEqual(
      expect.arrayContaining([
        { type: "Consultation", count: 1, revenue: 80 },
        { type: "Suivi", count: 1, revenue: 0 },
      ]),
    );
  });

  it("10.1-INT-004: agrège patients et statuts de bout en bout", async () => {
    const recent = new Date(Date.now() - 2 * DAY);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { startTime: recent, status: "CANCELLED", type: "Consultation", serviceType: null },
      { startTime: recent, status: "CONFIRMED", type: "Consultation", serviceType: null },
    ] as never);
    vi.mocked(prisma.patient.findMany).mockResolvedValue([
      { createdAt: recent },
      { createdAt: recent },
    ] as never);

    const stats = await getCabinetStatistics("30d");

    expect(stats.newPatients.value).toBe(2);
    expect(stats.appointments.byStatus.CANCELLED).toBe(1);
    expect(stats.appointments.byStatus.CONFIRMED).toBe(1);
    expect(stats.cancellationRate.value).toBe(50); // 1/2
  });
});
