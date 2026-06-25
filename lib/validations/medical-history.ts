/**
 * Schémas de validation Zod pour les antécédents médicaux (story 9.3).
 *
 * Validation isomorphe : utilisée côté client (formulaire) et côté serveur
 * (Server Actions) pour garantir des règles identiques.
 *
 * Sécurité (héritée 5.2) : `content` est trimé ; les inputs ne sont consommés
 * que via Prisma paramétré (aucune interpolation SQL brute). Ce module est
 * volontairement **pur** (aucun import Prisma/Supabase) pour être testable en
 * unit sans base.
 *
 * @module lib/validations/medical-history
 */

import { z } from "zod";

/** Longueur maximale du contenu d'un antécédent (caractères). */
export const MEDICAL_HISTORY_CONTENT_MAX_LENGTH = 2000;

/**
 * Catégories d'antécédent médical, dans l'ordre d'affichage souhaité.
 *
 * Doit rester synchronisé avec l'enum Prisma `MedicalHistoryCategory`.
 */
export const MEDICAL_HISTORY_CATEGORIES = [
  "ALLERGY",
  "CURRENT_TREATMENT",
  "SURGICAL_HISTORY",
  "FAMILY_HISTORY",
  "OTHER",
] as const;

/** Type union des catégories d'antécédent. */
export type MedicalHistoryCategory = (typeof MEDICAL_HISTORY_CATEGORIES)[number];

/**
 * Libellés FR lisibles des catégories d'antécédent (réutilisables côté UI).
 */
export const MEDICAL_HISTORY_CATEGORY_LABELS: Record<
  MedicalHistoryCategory,
  string
> = {
  ALLERGY: "Allergies",
  CURRENT_TREATMENT: "Traitements en cours",
  SURGICAL_HISTORY: "Antécédents chirurgicaux",
  FAMILY_HISTORY: "Antécédents familiaux",
  OTHER: "Autres",
};

/**
 * Schéma de validation d'un antécédent médical.
 *
 * Règles :
 * - `content` : trimé, non vide, ≤ 2000 caractères.
 * - `category` : ∈ valeurs de l'enum `MedicalHistoryCategory`.
 */
export const medicalHistoryEntrySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "L'antécédent ne peut pas être vide")
    .max(
      MEDICAL_HISTORY_CONTENT_MAX_LENGTH,
      `L'antécédent ne peut pas dépasser ${MEDICAL_HISTORY_CONTENT_MAX_LENGTH} caractères`
    ),
  category: z.enum(MEDICAL_HISTORY_CATEGORIES, {
    message: "La catégorie d'antécédent n'est pas valide",
  }),
});

/**
 * Type dérivé du schéma `medicalHistoryEntrySchema`.
 *
 * - Côté client : `useState<MedicalHistoryEntryFormValues>()` / formulaire
 * - Côté serveur : paramètre `data: MedicalHistoryEntryFormValues`
 */
export type MedicalHistoryEntryFormValues = z.infer<
  typeof medicalHistoryEntrySchema
>;
