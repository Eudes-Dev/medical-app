"use server";

/**
 * Server Actions pour le calendrier (Story 3.2).
 *
 * Ce module fournit les actions serveur pour:
 * - Récupérer les rendez-vous sur une plage de dates (getAppointmentsByDateRange)
 *
 * Les données incluent le patient (nom, prénom) pour l'affichage dans la grille.
 * Le filtre showCancelled permet d'exclure ou d'inclure les RDV annulés.
 *
 * @module app/dashboard/calendar/actions
 */

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";
import type { AppointmentWithPatient } from "@/types";

/**
 * Récupère les rendez-vous dont la plage horaire intersecte [startDate, endDate].
 *
 * - Inclut les données patient (firstName, lastName) pour l'affichage.
 * - Si showCancelled est false, exclut les rendez-vous au statut CANCELLED.
 * - Les dates sont comparées en UTC ; startDate/endDate doivent couvrir
 *   la plage affichée (ex: début de jour 8h → fin de jour 20h pour la grille).
 *
 * @param startDate - Début de la plage (inclus)
 * @param endDate - Fin de la plage (inclus)
 * @param showCancelled - Si true, les RDV annulés sont inclus ; sinon exclus
 * @returns Liste des rendez-vous avec patient
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié
 */
export async function getAppointmentsByDateRange(
  startDate: Date,
  endDate: Date,
  showCancelled: boolean
): Promise<AppointmentWithPatient[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError(
      "User must be authenticated to access calendar appointments"
    );
  }

  // Requête: RDV dont la plage [startTime, endTime] intersecte [startDate, endDate]
  // Condition: startTime < endDate ET endTime > startDate
  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { lt: endDate },
      endTime: { gt: startDate },
      ...(showCancelled ? {} : { status: { not: "CANCELLED" } }),
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Mapper vers le type AppointmentWithPatient (les dates Prisma sont des Date)
  return appointments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    type: a.type,
    notes: a.notes ?? undefined,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    patient: {
      id: a.patient.id,
      firstName: a.patient.firstName,
      lastName: a.patient.lastName,
      phone: "", // non utilisé dans le calendrier
      email: undefined,
      createdAt: a.createdAt, // fallback pour le type Patient
      updatedAt: a.updatedAt,
    },
  }));
}
