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

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import { appointmentSchema, type AppointmentFormValues } from "@/lib/validations/appointment";
import type { AppointmentWithPatient } from "@/types";
import type { AppointmentStatus } from "@/types";
import { sendCancellationEmail } from "@/lib/email/send-cancellation";

/** Chemin de la page calendrier à revalider après création/modification/suppression */
const CALENDAR_PATH = "/dashboard/calendar";

/**
 * Mappe un rendez-vous Prisma (avec patient) vers le type AppointmentWithPatient.
 *
 * Expose `serviceTypeId` et `serviceColor` (jeton de couleur du service rattaché,
 * story 7.3) pour l'accent couleur de la carte calendrier (AC 5). `serviceColor`
 * est `null` pour les RDV legacy (sans service).
 */
function toAppointmentWithPatient(a: {
  id: string;
  patientId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  serviceTypeId?: string | null;
  serviceType?: { color: string } | null;
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
    serviceTypeId: a.serviceTypeId ?? null,
    serviceColor: a.serviceType?.color ?? null,
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
  await requireUser();

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
      // Couleur du service rattaché (story 7.3) — accent secondaire de la carte.
      serviceType: { select: { color: true } },
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
  await requireUser();

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
    await requireUser();

    const parsed = appointmentSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "Données invalides. Vérifiez le formulaire.",
      };
    }

    const { patientId, startTime, duration, serviceTypeId, type, notes } =
      parsed.data;

    // Story 7.3 : si un type de soin est sélectionné, il fait autorité — on en
    // tire le libellé-instantané (`type`) et la durée réelle (`endTime`). Sinon
    // (RDV legacy / aucun service configuré) on conserve le comportement 3.3.
    let snapshotType = type ?? "Consultation";
    let durationMin = duration;
    if (serviceTypeId) {
      const service = await prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { label: true, durationMin: true, active: true },
      });
      if (!service) {
        return { success: false, error: "Type de soin introuvable." };
      }
      // Story 7.3 (SEC-002) : défense en profondeur dashboard — un service
      // archivé (active=false) ne doit pas être rattaché à un nouveau RDV,
      // même par un acteur de confiance via un client obsolète.
      if (!service.active) {
        return { success: false, error: "Ce type de soin est archivé et n'est plus disponible." };
      }
      snapshotType = service.label;
      durationMin = service.durationMin;
    }
    const endTime = addMinutes(startTime, durationMin);

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
        type: snapshotType,
        notes: notes ?? null,
        status: "PENDING",
        // N'ajoute la FK que si un service est sélectionné (RDV legacy = absent).
        ...(serviceTypeId ? { serviceTypeId } : {}),
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
    await requireUser();
    assertValidUuid(id);

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!existing) {
      return { success: false, error: "Rendez-vous introuvable." };
    }

    let startTime = existing.startTime;
    let endTime = existing.endTime;

    // Story 7.3 : si un type de soin est (re)sélectionné, il fait autorité pour
    // le libellé-instantané et la durée réelle. Sinon on préserve le snapshot
    // legacy (`existing.type`) — ne jamais le perdre lors d'une simple édition.
    let serviceTypeId: string | null = existing.serviceTypeId ?? null;
    let type = data.type ?? existing.type;
    let serviceDurationMin: number | null = null;
    if (data.serviceTypeId) {
      const service = await prisma.serviceType.findUnique({
        where: { id: data.serviceTypeId },
        select: { label: true, durationMin: true, active: true },
      });
      if (!service) {
        return { success: false, error: "Type de soin introuvable." };
      }
      // Story 7.3 (SEC-002) : on refuse de (re)rattacher un service archivé.
      // Le snapshot `type` legacy reste préservé tant qu'aucun service valide
      // n'est sélectionné (aucune perte d'historique).
      if (!service.active) {
        return { success: false, error: "Ce type de soin est archivé et n'est plus disponible." };
      }
      serviceTypeId = data.serviceTypeId;
      type = service.label;
      serviceDurationMin = service.durationMin;
    }

    if (data.startTime != null || data.duration != null || serviceDurationMin != null) {
      // Calcul du nouveau créneau (la durée en base peut ne pas être 15/30/45/60)
      const existingDurationMinutes = Math.round(
        (existing.endTime.getTime() - existing.startTime.getTime()) / (60 * 1000)
      );
      startTime = data.startTime ?? existing.startTime;
      const durationMinutes =
        serviceDurationMin ?? data.duration ?? existingDurationMinutes;
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

    const notes = data.notes !== undefined ? data.notes : existing.notes;

    const updated = await prisma.appointment.update({
      where: { id },
      data: { startTime, endTime, type, notes: notes ?? null, serviceTypeId },
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
    if (e instanceof BadRequestError) {
      return { success: false, error: "Identifiant de rendez-vous invalide." };
    }
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
    await requireUser();
    assertValidUuid(id);

    await prisma.appointment.delete({ where: { id } });
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    if (e instanceof BadRequestError) {
      return { success: false, error: "Identifiant de rendez-vous invalide." };
    }
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
    await requireUser();
    assertValidUuid(id);

    const allowed: AppointmentStatus[] = ["CONFIRMED", "CANCELLED", "COMPLETED"];
    if (!allowed.includes(status)) {
      return { success: false, error: "Statut invalide." };
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
    revalidatePath(CALENDAR_PATH);

    // Fire-and-forget : email d'annulation au patient si email disponible.
    if (status === "CANCELLED" && updated.patient.email) {
      void sendCancellationEmail({
        appointmentId: id,
        patientEmail: updated.patient.email,
        patientFirstName: updated.patient.firstName,
        appointmentDate: updated.startTime,
        appointmentType: updated.type,
      }).catch((err) => console.error("[email:cancellation] envoi échoué:", err));
    }

    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    if (e instanceof BadRequestError) {
      return { success: false, error: "Identifiant de rendez-vous invalide." };
    }
    console.error("[updateAppointmentStatus] Error:", e);
    return {
      success: false,
      error: "Impossible de modifier le statut. Réessayez plus tard.",
    };
  }
}
