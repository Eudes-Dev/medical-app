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
 * Schéma de validation d'une entrée de liste d'attente.
 *
 * Règles :
 * - `patientId` : UUID requis (patient existant, vérifié côté action).
 * - `serviceTypeId` : UUID optionnel (absent = « n'importe quel soin »).
 * - `priority` : enum, défaut `NORMAL`.
 * - `reason` / `notes` : textes libres trimés, bornés.
 * - `preferredFrom` / `preferredTo` : fenêtre de dates optionnelle ; si les deux
 *   sont fournies, `preferredTo >= preferredFrom`.
 */
export const waitlistEntrySchema = z
  .object({
    /** ID du patient en attente */
    patientId: z.string().uuid("Veuillez sélectionner un patient"),
    /** ID du type de soin souhaité (optionnel) */
    serviceTypeId: z.string().uuid("Type de soin invalide").optional(),
    /** Niveau d'urgence */
    priority: z.enum(WAITLIST_PRIORITIES).default("NORMAL"),
    /** Motif de la demande (≤ 200 car.). Vide → `undefined` (stocké `null`). */
    reason: z
      .string()
      .trim()
      .max(200, "Le motif ne peut pas dépasser 200 caractères")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    /** Notes internes (≤ 500 car.). Vide → `undefined` (stocké `null`). */
    notes: z
      .string()
      .trim()
      .max(500, "Les notes ne peuvent pas dépasser 500 caractères")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    /** Début de la fenêtre de dates souhaitée (optionnel) */
    preferredFrom: z.date().optional(),
    /** Fin de la fenêtre de dates souhaitée (optionnel) */
    preferredTo: z.date().optional(),
  })
  .refine(
    (d) => !d.preferredFrom || !d.preferredTo || d.preferredTo >= d.preferredFrom,
    {
      message: "La date de fin doit être postérieure ou égale à la date de début",
      path: ["preferredTo"],
    },
  );

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
