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
 * @module app/dashboard/patients/actions
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";
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
  /** Liste des patients pour la page courante */
  patients: PatientTableData[];
  /** Nombre total de patients (pour la pagination) */
  total: number;
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
 * Cette Server Action:
 * 1. Vérifie que l'utilisateur est authentifié
 * 2. Valide et sanitize les paramètres de recherche et pagination
 * 3. Construit une clause WHERE conditionnelle pour la recherche
 *    (recherche dans firstName, lastName, email si search fourni)
 * 4. Récupère les patients avec pagination (skip/take)
 * 5. Compte le total de patients correspondant aux filtres
 * 6. Retourne les patients et le total pour la pagination
 *
 * @param page - Numéro de page (commence à 1)
 * @param limit - Nombre de résultats par page (défaut: 10)
 * @param search - Terme de recherche optionnel (nom, prénom, email)
 * @returns Objet contenant la liste des patients et le total
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié
 * @throws {Error} En cas d'erreur de validation ou Prisma
 *
 * @example
 * ```typescript
 * // Récupérer la première page (10 patients)
 * const { patients, total } = await getPatients(1, 10);
 *
 * // Rechercher "Martin" dans les noms/prénoms/emails
 * const { patients, total } = await getPatients(1, 10, "Martin");
 * ```
 */
export async function getPatients(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<GetPatientsResult> {
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
        "User must be authenticated to access patient data"
      );
    }

    // Valider et sanitizer les paramètres de pagination
    const paginationResult = paginationSchema.safeParse({ page, limit });
    if (!paginationResult.success) {
      throw new Error(
        `Invalid pagination parameters: ${paginationResult.error.flatten().fieldErrors}`
      );
    }
    const { page: validatedPage, limit: validatedLimit } = paginationResult.data;

    // Valider et sanitizer le paramètre de recherche
    const searchResult = searchSchema.safeParse(search);
    if (!searchResult.success) {
      throw new Error(
        `Invalid search parameter: ${searchResult.error.flatten().formErrors.join(", ")}`
      );
    }
    const validatedSearch = searchResult.data;

    // Construire la clause WHERE pour la recherche
    // Si search est fourni et non vide, rechercher dans firstName, lastName, email
    // Sinon, pas de filtre (récupérer tous les patients)
    const where = validatedSearch
      ? {
          OR: [
            { firstName: { contains: validatedSearch, mode: "insensitive" as const } },
            { lastName: { contains: validatedSearch, mode: "insensitive" as const } },
            { email: { contains: validatedSearch, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Exécuter les requêtes en parallèle pour optimiser les performances
    // 1. Récupérer les patients avec pagination
    // 2. Compter le total de patients correspondant aux filtres
    const [patients, total] = await Promise.all([
      // Requête pour récupérer les patients de la page courante
      prisma.patient.findMany({
        where,
        skip: (validatedPage - 1) * validatedLimit, // Ignorer les patients des pages précédentes
        take: validatedLimit, // Limiter au nombre de résultats par page
        orderBy: { lastName: "asc" }, // Trier par nom de famille (ordre alphabétique)
        select: {
          // Sélectionner uniquement les champs nécessaires pour la table
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      }),
      // Requête pour compter le total de patients correspondant aux filtres
      prisma.patient.count({ where }),
    ]);

    // Retourner les résultats formatés
    return {
      patients,
      total,
    };
  } catch (error) {
    // Si c'est déjà une UnauthorizedError, la propager telle quelle
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    // Logger les erreurs Prisma et de validation pour faciliter le debugging
    console.error("[getPatients] Error:", error);

    // Propager l'erreur avec un message plus explicite
    throw new Error(
      `Failed to fetch patients: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Crée un nouveau patient en base de données.
 *
 * Cette Server Action:
 * 1. Vérifie que l'utilisateur est authentifié
 * 2. Valide les données avec `patientSchema` (Zod)
 * 3. Crée le patient via Prisma
 * 4. Revalide la liste des patients (`/dashboard/patients`)
 *
 * @param data - Données du formulaire de patient
 * @returns Résultat de la création (succès ou message d'erreur)
 */
export async function createPatient(
  data: PatientFormValues
): Promise<
  | { success: true; patient: PatientTableData }
  | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification via Supabase Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Vous devez être connecté pour créer un patient.",
      };
    }

    // Validation des données via Zod
    const parsed = patientSchema.safeParse(data);
    if (!parsed.success) {
      // On retourne un message générique côté client; le détail peut être loggé serveur
      console.error("[createPatient] Validation error:", parsed.error.flatten());
      return {
        success: false,
        error:
          "Les données du patient sont invalides. Veuillez vérifier les champs du formulaire.",
      };
    }

    // Création du patient en base
    const patient = await prisma.patient.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
      },
    });

    // Revalider la page liste des patients
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
 *
 * @param id - Identifiant du patient à mettre à jour
 * @param data - Données mises à jour
 * @returns Résultat de la mise à jour (succès ou message d'erreur)
 */
export async function updatePatient(
  id: string,
  data: PatientFormValues
): Promise<
  | { success: true; patient: PatientDetail }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Vous devez être connecté pour modifier un patient.",
      };
    }

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
        appointments: {
          orderBy: { startTime: "desc" },
        },
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
        })),
      },
    };
  } catch (error) {
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
 * @param id - Identifiant du patient
 * @returns Les détails du patient ou null s'il n'existe pas
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié
 */
export async function getPatientById(
  id: string | undefined | null
): Promise<PatientDetail | null> {
  try {
    // Sécurité supplémentaire: ne jamais appeler Prisma avec un id vide/undefined
    if (!id) {
      console.error("[getPatientById] Called without a valid id:", id);
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError(
        "User must be authenticated to access patient detail"
      );
    }

    const patient = await prisma.patient.findUnique({
      // À ce stade, `id` est garanti non nul/non vide
      where: { id },
      include: {
        appointments: {
          orderBy: { startTime: "desc" },
        },
      },
    });

    if (!patient) {
      return null;
    }

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
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
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
 *
 * @param id - Identifiant du patient à supprimer
 * @returns Résultat de la suppression (succès ou message d'erreur)
 */
export async function deletePatient(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un patient.",
      };
    }

    await prisma.patient.delete({
      where: { id },
    });

    revalidatePath("/dashboard/patients");
    revalidatePath(`/dashboard/patients/${id}`);

    return { success: true };
  } catch (error) {
    console.error("[deletePatient] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la suppression du patient. Veuillez réessayer.",
    };
  }
}

