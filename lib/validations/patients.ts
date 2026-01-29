/**
 * Schémas de validation Zod pour les patients
 *
 * Ce module contient les schémas de validation pour les opérations
 * liées aux patients (recherche, création, modification, etc.).
 *
 * @module lib/validations/patients
 */

import { z } from "zod";

/**
 * Schéma de validation pour le paramètre de recherche de patients.
 *
 * Règles:
 * - Longueur maximale: 100 caractères (pour éviter les requêtes trop longues)
 * - Caractères autorisés: lettres, chiffres, espaces, tirets, apostrophes
 * - Optionnel (peut être undefined ou une chaîne vide)
 *
 * @example
 * ```typescript
 * import { searchSchema } from '@/lib/validations/patients'
 *
 * const result = searchSchema.safeParse("Martin")
 * if (result.success) {
 *   const searchTerm = result.data // string | undefined
 * }
 * ```
 */
export const searchSchema = z
  .string()
  .max(100, "Le terme de recherche ne peut pas dépasser 100 caractères")
  .regex(
    /^[a-zA-Z0-9\s\-'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]*$/,
    "Le terme de recherche contient des caractères non autorisés"
  )
  .optional()
  .transform((val) => (val === "" ? undefined : val));

/**
 * Schéma de validation pour les paramètres de pagination.
 *
 * Règles:
 * - page: nombre entier positif (minimum 1)
 * - limit: nombre entier positif entre 1 et 100 (pour éviter les requêtes trop lourdes)
 *
 * @example
 * ```typescript
 * import { paginationSchema } from '@/lib/validations/patients'
 *
 * const result = paginationSchema.safeParse({ page: 1, limit: 10 })
 * ```
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().min(1).max(100).default(10),
});
