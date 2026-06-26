/**
 * Tests unitaires de la logique d'agrégation pure des statistiques (story 10.1).
 *
 * Test IDs: 10.1-UNIT-001..010
 * Level: Unit (aucune base, aucun mock — logique pure, `now` injecté)
 */

import { describe, it, expect } from "vitest";

import {
  aggregateStatistics,
  resolvePeriodRange,
  parseStatsPeriod,
  isStatsPeriod,
  DEFAULT_STATS_PERIOD,
  type StatAppointment,
  type StatsPeriod,
} from "@/lib/analytics/stats";

const NOW = new Date("2026-06-26T12:00:00.000Z");
const DAY = 86_400_000;

/** Date à `daysAgo` jours avant NOW (midi → loin des bornes de journée). */
function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY);
}

function appt(
  partial: Partial<StatAppointment> & { startTime: Date },
): StatAppointment {
  return {
    status: "COMPLETED",
    type: "Consultation",
    price: null,
    ...partial,
  };
}

describe("resolvePeriodRange", () => {
  it("10.1-UNIT-001: fenêtres journalières contiguës et sans chevauchement (30d)", () => {
    const { start, end, prevStart, prevEnd } = resolvePeriodRange("30d", NOW);

    expect(end.getTime()).toBe(NOW.getTime());
    // prevEnd colle immédiatement avant start (1 ms d'écart, aucun chevauchement)
    expect(prevEnd.getTime()).toBe(start.getTime() - 1);
    // start est un début de journée locale
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // la fenêtre précédente dure 30 jours calendaires
    expect(prevStart.getTime()).toBe(
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() - 30,
      ).getTime(),
    );
  });

  it("10.1-UNIT-002: période 12m = 12 mois calendaires, précédente contiguë", () => {
    const { start, end, prevStart, prevEnd } = resolvePeriodRange("12m", NOW);

    expect(end.getTime()).toBe(NOW.getTime());
    expect(start.getDate()).toBe(1); // 1er du mois
    expect(prevEnd.getTime()).toBe(start.getTime() - 1);
    // 11 mois en arrière pour `start`, 12 mois encore avant pour `prevStart`
    expect(start.getMonth()).toBe(new Date(NOW.getFullYear(), NOW.getMonth() - 11, 1).getMonth());
    expect(prevStart.getTime()).toBe(
      new Date(start.getFullYear(), start.getMonth() - 12, 1).getTime(),
    );
  });

  it("10.1-UNIT-003: 7d/90d couvrent la bonne largeur (inclut aujourd'hui)", () => {
    const r7 = resolvePeriodRange("7d", NOW);
    const r90 = resolvePeriodRange("90d", NOW);
    // start = startOfDay(now - (N-1) jours)
    const startOfToday = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate(),
    );
    expect(r7.start.getTime()).toBe(startOfToday.getTime() - 6 * DAY);
    expect(r90.start.getTime()).toBe(startOfToday.getTime() - 89 * DAY);
  });
});

describe("isStatsPeriod / parseStatsPeriod", () => {
  it("10.1-UNIT-004: garde de type et normalisation par défaut", () => {
    expect(isStatsPeriod("7d")).toBe(true);
    expect(isStatsPeriod("1y")).toBe(false);
    expect(parseStatsPeriod("90d")).toBe("90d");
    expect(parseStatsPeriod(undefined)).toBe(DEFAULT_STATS_PERIOD);
    expect(parseStatsPeriod("nope")).toBe("30d");
  });
});

describe("aggregateStatistics", () => {
  const period: StatsPeriod = "30d";

  const appointments: StatAppointment[] = [
    // --- Fenêtre courante (30 derniers jours) ---
    appt({ startTime: daysAgo(1), status: "COMPLETED", price: 50, type: "Consultation" }),
    appt({ startTime: daysAgo(2), status: "COMPLETED", price: null, type: "Consultation" }), // pas de prix → 0
    appt({ startTime: daysAgo(3), status: "PENDING", price: 20, type: "Suivi" }), // non COMPLETED → pas de CA
    appt({ startTime: daysAgo(4), status: "CANCELLED", price: 30, type: "Consultation" }), // exclu de byServiceType
    // --- Fenêtre précédente (~30→60 j) ---
    appt({ startTime: daysAgo(40), status: "COMPLETED", price: 100, type: "Consultation" }),
    // --- Hors des deux fenêtres ---
    appt({ startTime: daysAgo(200), status: "COMPLETED", price: 999, type: "Consultation" }),
  ];

  const patients = [
    { createdAt: daysAgo(2) }, // courant
    { createdAt: daysAgo(45) }, // précédent
    { createdAt: daysAgo(300) }, // hors fenêtre
  ];

  const result = aggregateStatistics({ appointments, patients, period, now: NOW });

  it("10.1-UNIT-005: CA = somme des prix des COMPLETED de la fenêtre (null → 0)", () => {
    expect(result.revenue.value).toBe(50);
    // prev = 100 → tendance -50 %
    expect(result.revenue.trendPercent).toBe(-50);
  });

  it("10.1-UNIT-006: total + répartition par statut", () => {
    expect(result.appointments.total).toBe(4);
    expect(result.appointments.byStatus).toEqual({
      PENDING: 1,
      CONFIRMED: 0,
      CANCELLED: 1,
      COMPLETED: 2,
    });
    // prev total = 1 → +300 %
    expect(result.appointments.trendPercent).toBe(300);
  });

  it("10.1-UNIT-007: nouveaux patients par fenêtre + tendance prev=1", () => {
    expect(result.newPatients.value).toBe(1);
    expect(result.newPatients.trendPercent).toBe(0);
  });

  it("10.1-UNIT-008: taux d'annulation à 1 décimale + écart en points", () => {
    expect(result.cancellationRate.value).toBe(25); // 1/4 = 25.0
    expect(result.cancellationRate.trendPoints).toBe(25); // prev 0 %
  });

  it("10.1-UNIT-009: byServiceType exclut CANCELLED, trie par count décroissant", () => {
    expect(result.byServiceType).toEqual([
      { type: "Consultation", count: 2, revenue: 50 },
      { type: "Suivi", count: 1, revenue: 0 },
    ]);
  });

  it("10.1-UNIT-010: fenêtres vides → zéros sans division par zéro", () => {
    const empty = aggregateStatistics({
      appointments: [],
      patients: [],
      period,
      now: NOW,
    });
    expect(empty.revenue.value).toBe(0);
    expect(empty.appointments.total).toBe(0);
    expect(empty.cancellationRate.value).toBe(0);
    expect(empty.revenue.trendPercent).toBe(0);
    expect(empty.byServiceType).toEqual([]);
  });
});
