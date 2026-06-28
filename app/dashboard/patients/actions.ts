"use server";

/**
 * Server Actions pour la gestion des patients
 *
 * Ce module contient les Server Actions pour:
 * - Récupérer la liste des patients avec pagination et recherche
 * - Créer un nouveau patient
 * - Mettre à jour un patient existant
 * - Récupérer un patient par son identifiant (avec historique de RDV)
 * - Supprimer un patient
 *
 * Sécurité (Story 5.2) :
 *  - Toutes les actions passent par `requireUser()` (lib/server/auth).
 *  - Les actions paramétrées par `id` valident l'UUID via `assertValidUuid()`
 *    avant tout appel Prisma.
 *  - Les schémas Zod (lib/validations/patients) ne consomment les inputs que
 *    via Prisma paramétré — aucune interpolation SQL brute.
 *
 * @module app/dashboard/patients/actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  searchSchema,
  paginationSchema,
  patientSchema,
  type PatientFormValues,
} from "@/lib/validations/patients";

/**
 * Type représentant un patient pour l'affichage dans la table.
 */
export type PatientTableData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
};

/**
 * Type de retour de la Server Action getPatients.
 */
export type GetPatientsResult = {
  patients: PatientTableData[];
  total: number;
};

/**
 * Statistiques agrégées affichées en tête de la liste patients (refonte UI).
 *
 * Uniquement des `count` Prisma (aucune donnée nominative renvoyée) → RGPD-safe.
 */
export type PatientStats = {
  /** Nombre total de dossiers patients. */
  total: number;
  /** Patients créés depuis le 1ᵉʳ du mois courant. */
  newThisMonth: number;
  /** Patients ayant au moins un rendez-vous (suivi en cours). */
  active: number;
  /** Rendez-vous à venir (PENDING/CONFIRMED, startTime ≥ maintenant). */
  upcomingAppointments: number;
};

/**
 * Type représentant un rendez-vous dans l'historique d'un patient.
 */
export type PatientAppointment = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  /// Détails optionnels affichés dans le panneau dépliable (story 9.4).
  motif: string | null;
  modalite: string | null;
  lieu: string | null;
  note: string | null;
};

/**
 * Type complet pour la fiche patient.
 */
export type PatientDetail = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointments: PatientAppointment[];
};

/**
 * Récupère la liste des patients avec pagination et recherche.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getPatients(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<GetPatientsResult> {
  try {
    await requireUser();

    const paginationResult = paginationSchema.safeParse({ page, limit });
    if (!paginationResult.success) {
      throw new Error(
        `Invalid pagination parameters: ${paginationResult.error.flatten().fieldErrors}`
      );
    }
    const { page: validatedPage, limit: validatedLimit } = paginationResult.data;

    const searchResult = searchSchema.safeParse(search);
    if (!searchResult.success) {
      throw new Error(
        `Invalid search parameter: ${searchResult.error.flatten().formErrors.join(", ")}`
      );
    }
    const validatedSearch = searchResult.data;

    const where = validatedSearch
      ? {
          OR: [
            { firstName: { contains: validatedSearch, mode: "insensitive" as const } },
            { lastName: { contains: validatedSearch, mode: "insensitive" as const } },
            { email: { contains: validatedSearch, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: (validatedPage - 1) * validatedLimit,
        take: validatedLimit,
        orderBy: { lastName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, total };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;

    console.error("[getPatients] Error:", error);
    throw new Error(
      `Failed to fetch patients: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Récupère des statistiques agrégées pour l'en-tête de la liste patients.
 *
 * N'expose aucune donnée nominative (uniquement des compteurs). Tolérant aux
 * pannes : en cas d'erreur inattendue, renvoie des zéros plutôt que de casser
 * la page (les stats sont décoratives, non bloquantes).
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getPatientStats(): Promise<PatientStats> {
  try {
    await requireUser();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, newThisMonth, active, upcomingAppointments] =
      await Promise.all([
        prisma.patient.count(),
        prisma.patient.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.patient.count({ where: { appointments: { some: {} } } }),
        prisma.appointment.count({
          where: {
            startTime: { gte: now },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        }),
      ]);

    return { total, newThisMonth, active, upcomingAppointments };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    console.error("[getPatientStats] Error:", error);
    return { total: 0, newThisMonth: 0, active: 0, upcomingAppointments: 0 };
  }
}

/**
 * Crée un nouveau patient en base de données.
 */
export async function createPatient(
  data: PatientFormValues
): Promise<
  | { success: true; patient: PatientTableData }
  | { success: false; error: string }
> {
  try {
    await requireUser();

    const parsed = patientSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[createPatient] Validation error:", parsed.error.flatten());
      return {
        success: false,
        error:
          "Les données du patient sont invalides. Veuillez vérifier les champs du formulaire.",
      };
    }

    const patient = await prisma.patient.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
      },
    });

    revalidatePath("/dashboard/patients");

    return {
      success: true,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour créer un patient.",
      };
    }
    console.error("[createPatient] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la création du patient. Veuillez réessayer.",
    };
  }
}

/**
 * Met à jour un patient existant.
 */
export async function updatePatient(
  id: string,
  data: PatientFormValues
): Promise<
  | { success: true; patient: PatientDetail }
  | { success: false; error: string }
> {
  try {
    await requireUser();
    assertValidUuid(id);

    const parsed = patientSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[updatePatient] Validation error:", parsed.error.flatten());
      return {
        success: false,
        error:
          "Les données du patient sont invalides. Veuillez vérifier les champs du formulaire.",
      };
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
      },
      include: {
        appointments: { orderBy: { startTime: "desc" } },
      },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${id}`);

    return {
      success: true,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone,
        email: patient.email,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        appointments: patient.appointments.map((appointment) => ({
          id: appointment.id,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          type: appointment.type,
          motif: appointment.motif ?? null,
          modalite: appointment.modalite ?? null,
          lieu: appointment.lieu ?? null,
          note: appointment.notes ?? null,
        })),
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour modifier un patient.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[updatePatient] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la mise à jour du patient. Veuillez réessayer.",
    };
  }
}

/**
 * Récupère un patient par son identifiant avec son historique de rendez-vous.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getPatientById(
  id: string | undefined | null
): Promise<PatientDetail | null> {
  try {
    if (!id) {
      console.error("[getPatientById] Called without a valid id:", id);
      return null;
    }

    await requireUser();
    assertValidUuid(id);

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { startTime: "desc" } },
      },
    });

    if (!patient) return null;

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      appointments: patient.appointments.map((appointment) => ({
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        type: appointment.type,
        motif: appointment.motif ?? null,
        modalite: appointment.modalite ?? null,
        lieu: appointment.lieu ?? null,
        note: appointment.notes ?? null,
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getPatientById] Invalid UUID:", error.message);
      return null;
    }

    console.error("[getPatientById] Error:", error);
    throw new Error(
      `Failed to fetch patient detail: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Supprime un patient de la base de données.
 *
 * ⚠️ Suppression "hard delete" (pas de soft delete dans cette story).
 */
export async function deletePatient(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireUser();
    assertValidUuid(id);

    await prisma.patient.delete({ where: { id } });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un patient.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[deletePatient] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression du patient. Veuillez réessayer.",
    };
  }
}
