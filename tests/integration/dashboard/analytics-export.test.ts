/**
 * Tests d'intégration de la Server Action d'export CSV des statistiques (10.2).
 *
 * Test IDs: 10.2-INT-001..004
 * Level: Integration (auth + couche d'accès 10.1 mockées — aucune base requise)
 *
 * Vérifie la frontière `exportCabinetStatisticsCsv` :
 *  - garde `requireUser()` ;
 *  - normalisation de la `period` puis délégation à `getCabinetStatistics` ;
 *  - forme du retour `{ success, fileName, csv }` (CSV avec BOM) ;
 *  - branche d'erreur `UnauthorizedError` → message FR.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";
import type { CabinetStatistics } from "@/lib/analytics/stats";

vi.mock("@/lib/server/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/app/dashboard/analytics/analytics-data", () => ({
  getCabinetStatistics: vi.fn(),
}));

import { requireUser } from "@/lib/server/auth";
import { getCabinetStatistics } from "@/app/dashboard/analytics/analytics-data";
import { exportCabinetStatisticsCsv } from "@/app/dashboard/analytics/export-actions";

const STATS: CabinetStatistics = {
  period: "30d",
  range: { start: "2026-05-28T00:00:00.000Z", end: "2026-06-26T12:00:00.000Z" },
  revenue: { value: 480, trendPercent: 10 },
  appointments: {
    total: 5,
    byStatus: { PENDING: 0, CONFIRMED: 1, COMPLETED: 3, CANCELLED: 1 },
    trendPercent: 0,
  },
  newPatients: { value: 2, trendPercent: 100 },
  cancellationRate: { value: 20, trendPoints: 5 },
  byServiceType: [{ type: "Consultation", count: 3, revenue: 240 }],
};

describe("exportCabinetStatisticsCsv (10.2-INT)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", email: "doc@cabinet.fr" });
    vi.mocked(getCabinetStatistics).mockResolvedValue(STATS);
  });

  it("10.2-INT-001: exige une session via requireUser()", async () => {
    await exportCabinetStatisticsCsv("30d");
    expect(requireUser).toHaveBeenCalledOnce();
  });

  it("10.2-INT-002: délègue à getCabinetStatistics avec la période normalisée", async () => {
    await exportCabinetStatisticsCsv("90d");
    expect(getCabinetStatistics).toHaveBeenCalledWith("90d");

    // Période inconnue (entrée client) → normalisée vers le défaut 30d.
    await exportCabinetStatisticsCsv("bogus" as never);
    expect(getCabinetStatistics).toHaveBeenLastCalledWith("30d");
  });

  it("10.2-INT-003: renvoie un CSV (BOM) et un nom de fichier sûr", async () => {
    const result = await exportCabinetStatisticsCsv("30d");
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.fileName).toMatch(/^statistiques-cabinet-30d-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv.startsWith("﻿")).toBe(true);
    expect(result.csv).toContain("Synthèse;Chiffre d'affaires (EUR);480,00;10 %");
    expect(result.csv).toContain("Type de soin;Consultation;3 RDV;240,00");
  });

  it("10.2-INT-004: requireUser rejette → erreur FR, pas d'appel d'agrégation", async () => {
    vi.mocked(requireUser).mockRejectedValue(new UnauthorizedError());

    const result = await exportCabinetStatisticsCsv("30d");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/connecté/i);
    expect(getCabinetStatistics).not.toHaveBeenCalled();
  });
});
