"use server";

/**
 * Server Actions pour la gestion des patients
 *
 * Ce module contient les Server Actions pour récupérer la liste des patients
 * avec pagination et recherche.
 *
 * @module app/dashboard/patients/actions
 */

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/errors";
import { searchSchema, paginationSchema } from "@/lib/validations/patients";

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
