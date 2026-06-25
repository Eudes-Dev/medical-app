/**
 * Schéma de validation Zod pour les entrées de liste d'attente (story 8.5).
 *
 * **Indépendant** d'`appointmentSchema` (sémantique différente : pas d'heure ni
 * de durée ici — on inscrit une demande, pas un RDV). On y retrouve les mêmes
 * conventions (`.trim()` sur les textes, `.uuid()` sur les ids, `.max()` sur les
 * textes libres, messages FR) et une fenêtre de dates optionnelle cohérente
 * (`preferredTo >= preferredFrom`).
 *
 * @module lib/validations/waitlist
 */

import { z } from "zod";

/** Niveaux d'urgence acceptés (alignés sur l'enum Prisma `WaitlistPriority`). */
export const WAITLIST_PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;

/**
 * Champs **modifiables** d'une entrée (partagés entre création et édition). Le
 * `patientId` n'en fait pas partie : on ne change pas le patient d'une demande
 * (on retire puis on ré-inscrit). Factorisé pour que `waitlistEntrySchema` et
 * `waitlistEntryUpdateSchema` restent strictement alignés (mêmes bornes, mêmes
 * messages).
 */
const waitlistEditableFields = {
  /** ID du type de soin souhaité (optionnel ; absent = « n'importe quel soin »). */
  serviceTypeId: z.string().uuid("Type de soin invalide").optional(),
  /** Niveau d'urgence */
  priority: z.enum(WAITLIST_PRIORITIES).default("NORMAL"),
  /** Motif de la demande (≤ 200 car.). Vide → `undefined` (stocké `null`). */
  reason: z
    .string()
    .trim()
    .max(200, "Le motif ne peut pas dépasser 200 caractères")
    .transform((v) => (v.length > 0 ? v : undefined))
    .optional(),
  /** Notes internes (≤ 500 car.). Vide → `undefined` (stocké `null`). */
  notes: z
    .string()
    .trim()
    .max(500, "Les notes ne peuvent pas dépasser 500 caractères")
    .transform((v) => (v.length > 0 ? v : undefined))
    .optional(),
  /** Début de la fenêtre de dates souhaitée (optionnel) */
  preferredFrom: z.date().optional(),
  /** Fin de la fenêtre de dates souhaitée (optionnel) */
  preferredTo: z.date().optional(),
} as const;

/** Cohérence de la fenêtre : `preferredTo >= preferredFrom` si les deux sont fournies. */
const preferredWindowCheck = (d: { preferredFrom?: Date; preferredTo?: Date }): boolean =>
  !d.preferredFrom || !d.preferredTo || d.preferredTo >= d.preferredFrom;

/** Options (message + chemin) du refine de fenêtre, partagées création/édition. */
const preferredWindowError = {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["preferredTo"],
};

/**
 * Schéma de validation d'une entrée de liste d'attente (**création**).
 *
 * Règles :
 * - `patientId` : UUID requis (patient existant, vérifié côté action).
 * - autres champs : cf. {@link waitlistEditableFields}.
 * - `preferredFrom` / `preferredTo` : fenêtre de dates optionnelle ; si les deux
 *   sont fournies, `preferredTo >= preferredFrom`.
 */
export const waitlistEntrySchema = z
  .object({
    /** ID du patient en attente */
    patientId: z.string().uuid("Veuillez sélectionner un patient"),
    ...waitlistEditableFields,
  })
  .refine(preferredWindowCheck, preferredWindowError);

/**
 * Schéma de validation d'une **édition** d'entrée (story 8.5, AC 8). Mêmes champs
 * modifiables que la création, sans `patientId`. Sémantique de **remplacement
 * complet** (le formulaire renvoie l'état courant entier) : un champ absent est
 * remis à `null` côté action — aligné sur `addToWaitlist`.
 */
export const waitlistEntryUpdateSchema = z
  .object({ ...waitlistEditableFields })
  .refine(preferredWindowCheck, preferredWindowError);

/**
 * Type **de sortie** (après parse) : `priority` est résolu (défaut appliqué).
 * Utilisé par les Server Actions et le handler de soumission.
 */
export type WaitlistEntryFormValues = z.infer<typeof waitlistEntrySchema>;

/**
 * Type **d'entrée** (avant parse) : `priority` est optionnel (le défaut n'est pas
 * encore appliqué). Utilisé pour typer `react-hook-form` (valeurs du formulaire)
 * de pair avec `WaitlistEntryFormValues` comme valeurs transformées.
 */
export type WaitlistEntryFormInput = z.input<typeof waitlistEntrySchema>;

/** Type de sortie de l'édition (après parse, défaut `priority` appliqué). */
export type WaitlistEntryUpdateValues = z.infer<typeof waitlistEntryUpdateSchema>;

/** Type d'entrée de l'édition (avant parse), pour typer `react-hook-form`. */
export type WaitlistEntryUpdateInput = z.input<typeof waitlistEntryUpdateSchema>;
