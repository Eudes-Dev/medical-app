/**
 * Couche d'accès serveur des statistiques du cabinet (story 10.1).
 *
 * Module `server-only` consommé par `app/dashboard/analytics/page.tsx`
 * (Server Component). Même esprit que `app/dashboard/overview-data.ts` : on
 * charge les fenêtres utiles depuis Prisma puis on délègue **toute** l'agrégation
 * à la logique pure `lib/analytics/stats.ts` (aucune règle de calcul dupliquée
 * ici). Le résultat renvoyé est sérialisable (cf. `CabinetStatistics`).
 *
 * @module app/dashboard/analytics/analytics-data
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import {
  aggregateStatistics,
  resolvePeriodRange,
  type CabinetStatistics,
  type StatAppointment,
  type StatsPeriod,
} from "@/lib/analytics/stats";

/**
 * Récupère et agrège les statistiques du cabinet pour une période donnée.
 *
 * Charge en deux requêtes (RDV + patients) la fenêtre `[prevStart, end]`
 * couvrant la période courante ET la période précédente (pour les tendances),
 * convertit `ServiceType.price` (`Decimal`) en nombre, puis délègue à
 * `aggregateStatistics`.
 *
 * Sécurité : `requireUser()` en tête (défense en profondeur — le middleware
 * `/dashboard/*` reste la 1ʳᵉ ligne). Aucune donnée patient nominative n'est
 * exposée (agrégats + libellés de soins uniquement).
 */
export async function getCabinetStatistics(
  period: StatsPeriod,
): Promise<CabinetStatistics> {
  await requireUser();

  const now = new Date();
  const { prevStart, end } = resolvePeriodRange(period, now);

  const [appointmentsRaw, patients] = await Promise.all([
    prisma.appointment.findMany({
      where: { startTime: { gte: prevStart, lte: end } },
      select: {
        startTime: true,
        status: true,
        type: true,
        serviceType: { select: { price: true } },
      },
    }),
    prisma.patient.findMany({
      where: { createdAt: { gte: prevStart, lte: end } },
      select: { createdAt: true },
    }),
  ]);

  const appointments: StatAppointment[] = appointmentsRaw.map((a) => ({
    startTime: a.startTime,
    status: a.status,
    type: a.type,
    price:
      a.serviceType?.price != null ? Number(a.serviceType.price) : null,
  }));

  return aggregateStatistics({ appointments, patients, period, now });
}
