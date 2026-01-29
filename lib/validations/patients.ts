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

/**
 * Schéma de validation pour les données de base d'un patient.
 *
 * ⚠️ IMPORTANT:
 * - Ce schéma est utilisé à la fois côté client (react-hook-form via zodResolver)
 *   et côté serveur (Server Actions Next.js) pour garantir une validation
 *   isomorphe.
 * - Les règles sont alignées sur le schéma Prisma `Patient` (email optionnel).
 *
 * Règles de validation:
 * - lastName:
 *   - chaîne non vide
 *   - au minimum 2 caractères
 * - firstName:
 *   - chaîne non vide
 *   - au minimum 2 caractères
 * - phone:
 *   - chaîne non vide
 *   - exactement 10 chiffres (format simple FR, ex: "0612345678")
 * - email:
 *   - optionnel
 *   - si présent, doit être un email valide
 */
export const patientSchema = z.object({
  // Nom de famille du patient (obligatoire)
  lastName: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères"),

  // Prénom du patient (obligatoire)
  firstName: z
    .string()
    .trim()
    .min(2, "Le prénom doit contenir au moins 2 caractères"),

  // Numéro de téléphone au format français simplifié: 10 chiffres consécutifs
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Le numéro de téléphone doit contenir exactement 10 chiffres"),

  // Email optionnel (aligné avec `email String?` dans Prisma).
  // Si fourni, il doit respecter le format d'une adresse email valide.
  email: z
    .string()
    .trim()
    .email("L'adresse email n'est pas valide")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/**
 * Type dérivé du schéma `patientSchema`.
 *
 * Utile pour typer les formulaires et les Server Actions:
 * - Côté client: `useForm<PatientFormValues>()`
 * - Côté serveur: paramètre `data: PatientFormValues`
 */
export type PatientFormValues = z.infer<typeof patientSchema>;
