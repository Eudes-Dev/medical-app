"use server";

/**
 * Server Action d'export CSV des statistiques du cabinet (story 10.2).
 *
 * Clôt l'épopée 10 « Analytics » : complète la page Statistiques (10.1) en
 * permettant de **télécharger** les mêmes agrégats au format CSV (Excel /
 * LibreOffice). Réutilise **intégralement** la couche d'accès 10.1
 * (`getCabinetStatistics`) — aucune requête Prisma ni règle de calcul n'est
 * réécrite ici — puis délègue la sérialisation à la logique pure
 * `lib/analytics/stats-csv.ts`.
 *
 * ⚠️ Module `"use server"`, PAS une route : ne jamais renommer `page.tsx`/`route.ts`.
 *
 * Sécurité : `requireUser()` en tête (le middleware `/dashboard/*` reste la 1ʳᵉ
 * ligne) ; `period` (entrée client) normalisée par `parseStatsPeriod` ; aucune
 * PII patient nominative exportée (agrégats + libellés de soins). Pas d'entrée
 * au journal d'audit (11.3) : celui-ci est patient-centré, l'export d'agrégats
 * anonymes n'en relève pas.
 *
 * @module app/dashboard/analytics/export-actions
 */

import { getCabinetStatistics } from "@/app/dashboard/analytics/analytics-data";
import { parseStatsPeriod, type StatsPeriod } from "@/lib/analytics/stats";
import {
  buildStatisticsCsv,
  buildStatisticsCsvFileName,
} from "@/lib/analytics/stats-csv";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Produit le CSV des statistiques du cabinet pour une période donnée.
 *
 * @returns Le nom de fichier sûr et la chaîne CSV (avec BOM), ou une erreur FR.
 */
export async function exportCabinetStatisticsCsv(
  period: StatsPeriod,
): Promise<
  | { success: true; fileName: string; csv: string }
  | { success: false; error: string }
> {
  try {
    await requireUser();

    // L'entrée vient du client : on normalise vers une StatsPeriod connue.
    const safePeriod = parseStatsPeriod(period);

    const stats = await getCabinetStatistics(safePeriod);

    return {
      success: true,
      fileName: buildStatisticsCsvFileName(safePeriod, new Date()),
      csv: buildStatisticsCsv(stats),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour exporter les statistiques.",
      };
    }
    console.error("[exportCabinetStatisticsCsv] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'export des statistiques. Veuillez réessayer.",
    };
  }
}
