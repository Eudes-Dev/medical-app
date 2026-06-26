/**
 * Tests unitaires de la génération CSV pure des statistiques (story 10.2).
 *
 * Test IDs: 10.2-UNIT-001..009
 * Level: Unit (aucune base, aucun mock — logique pure, `now` injecté)
 */

import { describe, it, expect } from "vitest";

import {
  buildStatisticsCsv,
  buildStatisticsCsvFileName,
  escapeCsvField,
  formatAmountFr,
} from "@/lib/analytics/stats-csv";
import type { CabinetStatistics } from "@/lib/analytics/stats";

/** Fabrique un `CabinetStatistics` complet, surchargeable par test. */
function makeStats(overrides: Partial<CabinetStatistics> = {}): CabinetStatistics {
  return {
    period: "30d",
    range: { start: "2026-05-28T00:00:00.000Z", end: "2026-06-26T12:00:00.000Z" },
    revenue: { value: 1234.5, trendPercent: 12 },
    appointments: {
      total: 10,
      byStatus: { PENDING: 1, CONFIRMED: 2, COMPLETED: 6, CANCELLED: 1 },
      trendPercent: -5,
    },
    newPatients: { value: 4, trendPercent: 0 },
    cancellationRate: { value: 10, trendPoints: 2 },
    byServiceType: [
      { type: "Consultation", count: 6, revenue: 480 },
      { type: "Suivi", count: 3, revenue: 0 },
    ],
    ...overrides,
  };
}

/** Découpe la chaîne CSV en lignes (sans le BOM), CRLF retiré. */
function csvLines(csv: string): string[] {
  return csv.replace(/^﻿/, "").split("\r\n").filter((l) => l.length > 0);
}

describe("escapeCsvField (10.2-UNIT)", () => {
  it("10.2-UNIT-001: entoure de guillemets et double les guillemets internes", () => {
    expect(escapeCsvField("simple")).toBe("simple");
    expect(escapeCsvField("a;b")).toBe('"a;b"');
    expect(escapeCsvField('dit "bonjour"')).toBe('"dit ""bonjour"""');
    expect(escapeCsvField("ligne1\nligne2")).toBe('"ligne1\nligne2"');
    expect(escapeCsvField(42)).toBe("42");
  });
});

describe("formatAmountFr (10.2-UNIT)", () => {
  it("10.2-UNIT-002: 2 décimales, virgule, sans symbole ni milliers", () => {
    expect(formatAmountFr(1234.5)).toBe("1234,50");
    expect(formatAmountFr(0)).toBe("0,00");
    expect(formatAmountFr(80)).toBe("80,00");
  });
});

describe("buildStatisticsCsv (10.2-UNIT)", () => {
  it("10.2-UNIT-003: commence par le BOM, contient l'en-tête et des CRLF", () => {
    const csv = buildStatisticsCsv(makeStats());
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.includes("\r\n")).toBe(true);
    expect(csvLines(csv)[0]).toBe("Section;Libellé;Valeur;Tendance");
  });

  it("10.2-UNIT-004: écrit la période, la synthèse (montants FR) et les tendances", () => {
    const lines = csvLines(buildStatisticsCsv(makeStats()));
    expect(lines).toContain(
      "Synthèse;Chiffre d'affaires (EUR);1234,50;12 %",
    );
    expect(lines).toContain("Synthèse;Rendez-vous (total);10;-5 %");
    expect(lines).toContain("Synthèse;Nouveaux patients;4;0 %");
    expect(lines).toContain(
      "Synthèse;Taux d'annulation / no-show (%);10,00;2 pts",
    );
    // Période : dates FR JJ/MM/AAAA + flèche.
    const periodLine = lines.find((l) => l.startsWith("Période;"));
    expect(periodLine).toMatch(/Période;30 jours;\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4};/);
  });

  it("10.2-UNIT-005: une ligne par statut dans l'ordre attendu", () => {
    const lines = csvLines(buildStatisticsCsv(makeStats()));
    const statusLines = lines.filter((l) => l.startsWith("Statut;"));
    expect(statusLines).toEqual([
      "Statut;En attente;1;",
      "Statut;Confirmés;2;",
      "Statut;Terminés;6;",
      "Statut;Annulés;1;",
    ]);
  });

  it("10.2-UNIT-006: liste complète des soins (pas de troncature top 5)", () => {
    const byServiceType = Array.from({ length: 8 }, (_, i) => ({
      type: `Soin ${i + 1}`,
      count: 8 - i,
      revenue: i * 10,
    }));
    const lines = csvLines(buildStatisticsCsv(makeStats({ byServiceType })));
    const serviceLines = lines.filter((l) => l.startsWith("Type de soin;"));
    expect(serviceLines).toHaveLength(8);
    expect(serviceLines[0]).toBe("Type de soin;Soin 1;8 RDV;0,00");
  });

  it("10.2-UNIT-007: échappe un libellé de soin contenant ; \" et un saut de ligne", () => {
    const byServiceType = [
      { type: 'Bilan; "complet"\nurgent', count: 1, revenue: 50 },
    ];
    const csv = buildStatisticsCsv(makeStats({ byServiceType }));
    // Le champ entier est entouré de guillemets, guillemets internes doublés.
    expect(csv).toContain('Type de soin;"Bilan; ""complet""\nurgent";1 RDV;50,00');
  });

  it("10.2-UNIT-008: byServiceType vide → aucune ligne soin, sections conservées", () => {
    const lines = csvLines(buildStatisticsCsv(makeStats({ byServiceType: [] })));
    expect(lines.some((l) => l.startsWith("Type de soin;"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Synthèse;"))).toBe(true);
    expect(lines.filter((l) => l.startsWith("Statut;"))).toHaveLength(4);
  });
});

describe("buildStatisticsCsvFileName (10.2-UNIT)", () => {
  it("10.2-UNIT-009: slug ASCII sûr, daté AAAA-MM-JJ, avec la période", () => {
    const name = buildStatisticsCsvFileName("90d", new Date("2026-06-26T12:00:00.000Z"));
    expect(name).toBe("statistiques-cabinet-90d-2026-06-26.csv");
    // Aucun caractère de traversal ni espace.
    expect(name).not.toMatch(/[\\/\s]/);
  });
});
