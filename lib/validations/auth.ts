/**
 * Schémas de validation Zod pour l'authentification
 *
 * Ce module contient les schémas de validation pour les formulaires
 * d'authentification (login, inscription, etc.).
 *
 * @module lib/validations/auth
 */

import { z } from "zod";

/**
 * Schéma de validation pour le formulaire de connexion.
 *
 * Règles:
 * - email: doit être un email valide
 * - password: minimum 6 caractères
 *
 * @example
 * ```typescript
 * import { loginSchema } from '@/lib/validations/auth'
 *
 * const result = loginSchema.safeParse({
 *   email: 'test@example.com',
 *   password: 'secret123'
 * })
 *
 * if (!result.success) {
 *   console.log(result.error.flatten())
 * }
 * ```
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

/**
 * Type inféré du formulaire de connexion.
 * Utilisé pour typer les données du formulaire dans react-hook-form.
 */
export type LoginFormData = z.infer<typeof loginSchema>;
