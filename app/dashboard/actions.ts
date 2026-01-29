"use server";

/**
 * Server Actions pour le Dashboard
 *
 * Ce module contient les Server Actions pour récupérer les données
 * statistiques du dashboard (nombre de RDV du jour, prochains RDV).
 *
 * @module app/dashboard/actions
 */

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Type de retour pour les statistiques du dashboard.
 */
export type DashboardStats = {
  /** Nombre total de rendez-vous aujourd'hui */
  todayAppointmentsCount: number;
  /** Liste des 5 prochains rendez-vous (status CONFIRMED ou PENDING) */
  upcomingAppointments: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    patient: {
      firstName: string;
      lastName: string;
    };
    type: string;
    status: string;
  }>;
};

/**
 * Récupère les statistiques du dashboard pour le praticien authentifié.
 *
 * Cette Server Action:
 * 1. Vérifie que l'utilisateur est authentifié
 * 2. Calcule le nombre de RDV aujourd'hui (startTime dans la journée)
 * 3. Récupère les 5 prochains RDV avec status CONFIRMED ou PENDING
 * 4. Retourne les statistiques formatées
 *
 * @returns Statistiques du dashboard
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié
 * @throws {Error} En cas d'erreur Prisma
 *
 * @example
 * ```typescript
 * const stats = await getDashboardStats();
 * console.log(stats.todayAppointmentsCount); // 8
 * ```
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Vérifier l'authentification via Supabase Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si l'utilisateur n'est pas authentifié, lever une erreur explicite
    // (le middleware devrait normalement empêcher l'accès, mais double vérification)
    if (!user) {
      throw new UnauthorizedError(
        "User must be authenticated to access dashboard statistics"
      );
    }

    // Calculer le début et la fin de la journée actuelle (UTC)
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
    );

    // Compter les rendez-vous d'aujourd'hui
    // Filtre: startTime entre le début et la fin de la journée
    const todayAppointmentsCount = await prisma.appointment.count({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Récupérer les 5 prochains rendez-vous
    // Filtres:
    // - startTime >= maintenant (futurs RDV uniquement)
    // - status CONFIRMED ou PENDING (exclut CANCELLED et COMPLETED)
    // Tri: par startTime croissant (les plus proches en premier)
    // Limite: 5 résultats
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: now, // Seulement les RDV futurs
        },
        status: {
          in: ["CONFIRMED", "PENDING"], // Seulement les RDV confirmés ou en attente
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        startTime: "asc", // Tri croissant: les plus proches en premier
      },
      take: 5, // Limiter à 5 résultats
    });

    // Formater les résultats pour le retour
    return {
      todayAppointmentsCount,
      upcomingAppointments: upcomingAppointments.map((appointment) => ({
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        patient: {
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
        },
        type: appointment.type,
        status: appointment.status,
      })),
    };
  } catch (error) {
    // Si c'est déjà une UnauthorizedError, la propager telle quelle
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    // Logger les erreurs Prisma pour faciliter le debugging
    console.error("[getDashboardStats] Prisma error:", error);

    // Propager l'erreur avec un message plus explicite
    throw new Error(
      `Failed to fetch dashboard statistics: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
