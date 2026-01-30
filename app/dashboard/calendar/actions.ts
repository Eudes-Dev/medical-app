"use server";

/**
 * Server Actions pour le calendrier (Story 3.2, 3.3).
 *
 * Ce module fournit les actions serveur pour:
 * - Récupérer les rendez-vous sur une plage de dates (getAppointmentsByDateRange)
 * - Vérifier les conflits d'horaires (checkConflict)
 * - CRUD rendez-vous (createAppointment, updateAppointment, deleteAppointment)
 * - Mise à jour du statut (updateAppointmentStatus)
 *
 * Les données incluent le patient (nom, prénom) pour l'affichage dans la grille.
 * Le filtre showCancelled permet d'exclure ou d'inclure les RDV annulés.
 *
 * @module app/dashboard/calendar/actions
 */

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";
import { appointmentSchema, type AppointmentFormValues } from "@/lib/validations/appointment";
import type { AppointmentWithPatient } from "@/types";
import type { AppointmentStatus } from "@/types";

/** Chemin de la page calendrier à revalider après création/modification/suppression */
const CALENDAR_PATH = "/dashboard/calendar";

/**
 * Vérifie que l'utilisateur est authentifié.
 * @throws {UnauthorizedError} Si non connecté
 */
async function ensureAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new UnauthorizedError(
      "User must be authenticated to access calendar appointments"
    );
  }
  return { supabase };
}

/**
 * Mappe un rendez-vous Prisma (avec patient) vers le type AppointmentWithPatient.
 */
function toAppointmentWithPatient(a: {
  id: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; firstName: string; lastName: string };
}) {
  return {
    id: a.id,
    patientId: a.patientId,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status as AppointmentStatus,
    type: a.type,
    notes: a.notes ?? undefined,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    patient: {
      id: a.patient.id,
      firstName: a.patient.firstName,
      lastName: a.patient.lastName,
      phone: "",
      email: undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    },
  } satisfies AppointmentWithPatient;
}

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
  await ensureAuth();

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

  return appointments.map((a) => toAppointmentWithPatient(a));
}

// ---------------------------------------------------------------------------
// Story 3.3: Vérification des conflits et CRUD rendez-vous
// ---------------------------------------------------------------------------

/**
 * Vérifie si un créneau [startTime, endTime] chevauche un RDV existant.
 *
 * Algorithme: deux plages se chevauchent si
 *   existant.startTime < newEnd && existant.endTime > newStart.
 * Les RDV au statut CANCELLED sont exclus.
 *
 * @param startTime - Début du créneau
 * @param endTime - Fin du créneau
 * @param excludeId - ID d'un RDV à exclure (ex: en cas de modification)
 * @returns { hasConflict, conflictingAppointment? } pour afficher un message d'erreur explicite
 */
export async function checkConflict(
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: AppointmentWithPatient }> {
  await ensureAuth();

  const conflict = await prisma.appointment.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!conflict) {
    return { hasConflict: false };
  }

  return {
    hasConflict: true,
    conflictingAppointment: toAppointmentWithPatient(conflict),
  };
}

/** Résultat de la création d'un rendez-vous */
export type CreateAppointmentResult =
  | { success: true; appointment: AppointmentWithPatient }
  | { success: false; error: string };

/**
 * Crée un nouveau rendez-vous.
 *
 * 1. Valide les données avec Zod (startTime + duration → endTime calculé)
 * 2. Vérifie les conflits via checkConflict
 * 3. Insère en base (status: PENDING)
 * 4. Revalide la page calendrier (le client doit clear le cache Zustand)
 */
export async function createAppointment(
  data: AppointmentFormValues
): Promise<CreateAppointmentResult> {
  try {
    await ensureAuth();

    const parsed = appointmentSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "Données invalides. Vérifiez le formulaire.",
      };
    }

    const { patientId, startTime, duration, type, notes } = parsed.data;
    const endTime = addMinutes(startTime, duration);

    const { hasConflict, conflictingAppointment } = await checkConflict(
      startTime,
      endTime
    );
    if (hasConflict && conflictingAppointment) {
      const name = `${conflictingAppointment.patient.firstName} ${conflictingAppointment.patient.lastName}`;
      return {
        success: false,
        error: `Ce créneau est déjà occupé (${name}). Choisissez un autre horaire.`,
      };
    }

    const created = await prisma.appointment.create({
      data: {
        patientId,
        startTime,
        endTime,
        type,
        notes: notes ?? null,
        status: "PENDING",
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    revalidatePath(CALENDAR_PATH);
    return {
      success: true,
      appointment: toAppointmentWithPatient(created),
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    console.error("[createAppointment] Error:", e);
    return {
      success: false,
      error: "Impossible de créer le rendez-vous. Réessayez plus tard.",
    };
  }
}

/** Résultat de la mise à jour d'un rendez-vous */
export type UpdateAppointmentResult =
  | { success: true; appointment: AppointmentWithPatient }
  | { success: false; error: string };

/**
 * Met à jour un rendez-vous (champs partiels).
 * Si startTime ou duration sont modifiés, revérifie les conflits.
 */
export async function updateAppointment(
  id: string,
  data: Partial<AppointmentFormValues>
): Promise<UpdateAppointmentResult> {
  try {
    await ensureAuth();

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!existing) {
      return { success: false, error: "Rendez-vous introuvable." };
    }

    let startTime = existing.startTime;
    let endTime = existing.endTime;

    if (data.startTime != null || data.duration != null) {
      // Calcul du nouveau créneau (la durée en base peut ne pas être 15/30/45/60)
      const existingDurationMinutes = Math.round(
        (existing.endTime.getTime() - existing.startTime.getTime()) / (60 * 1000)
      );
      startTime = data.startTime ?? existing.startTime;
      const durationMinutes =
        data.duration ?? existingDurationMinutes;
      if (durationMinutes < 1 || durationMinutes > 240) {
        return { success: false, error: "Durée invalide (1 à 240 min)." };
      }
      endTime = addMinutes(startTime, durationMinutes);

      const { hasConflict, conflictingAppointment } = await checkConflict(
        startTime,
        endTime,
        id
      );
      if (hasConflict && conflictingAppointment) {
        const name = `${conflictingAppointment.patient.firstName} ${conflictingAppointment.patient.lastName}`;
        return {
          success: false,
          error: `Ce créneau est déjà occupé (${name}). Choisissez un autre horaire.`,
        };
      }
    }

    const type = data.type ?? existing.type;
    const notes = data.notes !== undefined ? data.notes : existing.notes;

    const updated = await prisma.appointment.update({
      where: { id },
      data: { startTime, endTime, type, notes: notes ?? null },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    revalidatePath(CALENDAR_PATH);
    return {
      success: true,
      appointment: toAppointmentWithPatient(updated),
    };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    console.error("[updateAppointment] Error:", e);
    return {
      success: false,
      error: "Impossible de modifier le rendez-vous. Réessayez plus tard.",
    };
  }
}

/**
 * Supprime définitivement un rendez-vous.
 */
export async function deleteAppointment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();

    await prisma.appointment.delete({ where: { id } });
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    console.error("[deleteAppointment] Error:", e);
    return {
      success: false,
      error: "Impossible de supprimer le rendez-vous. Réessayez plus tard.",
    };
  }
}

/**
 * Met à jour uniquement le statut d'un rendez-vous (CONFIRMED, CANCELLED, COMPLETED).
 */
export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();

    const allowed: AppointmentStatus[] = ["CONFIRMED", "CANCELLED", "COMPLETED"];
    if (!allowed.includes(status)) {
      return { success: false, error: "Statut invalide." };
    }

    await prisma.appointment.update({
      where: { id },
      data: { status },
    });
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    console.error("[updateAppointmentStatus] Error:", e);
    return {
      success: false,
      error: "Impossible de modifier le statut. Réessayez plus tard.",
    };
  }
}
