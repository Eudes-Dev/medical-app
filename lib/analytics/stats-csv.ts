/**
 * Génération **pure** du CSV d'export des statistiques du cabinet (story 10.2).
 *
 * Sérialise un objet `CabinetStatistics` (produit par la logique d'agrégation
 * 10.1, `lib/analytics/stats.ts`) en une chaîne CSV unique, **sans accès base,
 * sans `server-only`, sans React** : entièrement testable en isolation (`now`
 * injecté pour un nom de fichier déterministe).
 *
 * Format : séparateur `;` (locale FR / Excel), fins de ligne CRLF, BOM UTF-8 en
 * tête (accents corrects dans Excel), montants en virgule décimale FR sans
 * symbole monétaire, échappement RFC 4180. La couche d'accès / Server Action
 * (`app/dashboard/analytics/export-actions.ts`) se contente d'appeler
 * `getCabinetStatistics` puis de déléguer ici — aucun calcul d'agrégation n'y
 * est dupliqué.
 *
 * @module lib/analytics/stats-csv
 */

import {
  STATS_PERIODS,
  type CabinetStatistics,
  type StatsPeriod,
  type StatAppointmentStatus,
} from "@/lib/analytics/stats";

/** Séparateur de colonnes (point-virgule — locale FR, Excel sans assistant). */
const SEP = ";";
/** Fin de ligne CRLF (RFC 4180). */
const EOL = "\r\n";
/** BOM UTF-8 (Excel affiche alors correctement les accents). */
const BOM = "﻿";

/**
 * Échappe un champ CSV selon la RFC 4180 : si le champ contient le séparateur,
 * un guillemet, ou un saut de ligne, il est entouré de guillemets et ses
 * guillemets internes sont doublés. Les valeurs `number` sont rendues telles
 * quelles (déjà formatées en amont).
 */
export function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Formate un montant en euros à la française : 2 décimales, virgule décimale,
 * **sans** symbole `€` ni séparateur de milliers (reste typé « nombre » dans un
 * tableur). Ex. `1234.5` → `"1234,50"`.
 */
export function formatAmountFr(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Construit une ligne CSV à partir de champs (échappés puis joints par `;`). */
function row(fields: (string | number)[]): string {
  return fields.map(escapeCsvField).join(SEP);
}

/** Libellé FR d'une période (`STATS_PERIODS`), ou la valeur brute en secours. */
function periodLabel(period: StatsPeriod): string {
  return STATS_PERIODS.find((p) => p.value === period)?.label ?? period;
}

/** Date ISO → `JJ/MM/AAAA` (locale FR, fuseau local du serveur). */
function formatDateFr(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Libellés FR des statuts (identiques à la page Statistiques 10.1). */
const STATUS_LABELS: Record<StatAppointmentStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmés",
  COMPLETED: "Terminés",
  CANCELLED: "Annulés",
};

/** Ordre d'affichage des statuts (cohérent avec la page). */
const STATUS_ORDER: StatAppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

/**
 * Transforme l'objet agrégé `CabinetStatistics` en une chaîne CSV rectangulaire.
 *
 * Colonnes : `Section;Libellé;Valeur;Tendance`. Sections successives : Période,
 * Synthèse (4 KPI), Statut (4 lignes), Type de soin (liste **complète** triée,
 * annulations déjà exclues en 10.1 ; aucune ligne si vide).
 */
export function buildStatisticsCsv(stats: CabinetStatistics): string {
  const lines: string[] = [];

  lines.push(row(["Section", "Libellé", "Valeur", "Tendance"]));

  // Période
  lines.push(
    row([
      "Période",
      periodLabel(stats.period),
      `${formatDateFr(stats.range.start)} → ${formatDateFr(stats.range.end)}`,
      "",
    ]),
  );

  // Synthèse (KPI + tendances)
  lines.push(
    row([
      "Synthèse",
      "Chiffre d'affaires (EUR)",
      formatAmountFr(stats.revenue.value),
      `${stats.revenue.trendPercent} %`,
    ]),
  );
  lines.push(
    row([
      "Synthèse",
      "Rendez-vous (total)",
      stats.appointments.total,
      `${stats.appointments.trendPercent} %`,
    ]),
  );
  lines.push(
    row([
      "Synthèse",
      "Nouveaux patients",
      stats.newPatients.value,
      `${stats.newPatients.trendPercent} %`,
    ]),
  );
  lines.push(
    row([
      "Synthèse",
      "Taux d'annulation / no-show (%)",
      formatAmountFr(stats.cancellationRate.value),
      `${stats.cancellationRate.trendPoints} pts`,
    ]),
  );

  // Répartition par statut
  for (const status of STATUS_ORDER) {
    lines.push(
      row([
        "Statut",
        STATUS_LABELS[status],
        stats.appointments.byStatus[status],
        "",
      ]),
    );
  }

  // Répartition par type de soin (liste complète, annulations déjà exclues)
  for (const service of stats.byServiceType) {
    lines.push(
      row([
        "Type de soin",
        service.type,
        `${service.count} RDV`,
        formatAmountFr(service.revenue),
      ]),
    );
  }

  return BOM + lines.join(EOL) + EOL;
}

/**
 * Nom de fichier d'export **sûr** : slug ASCII daté, sans espace ni caractère de
 * traversal. Ex. `statistiques-cabinet-30d-2026-06-26.csv`.
 */
export function buildStatisticsCsvFileName(
  period: StatsPeriod,
  now: Date,
): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `statistiques-cabinet-${period}-${year}-${month}-${day}.csv`;
}
