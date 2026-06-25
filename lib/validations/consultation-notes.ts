/**
 * Schémas de validation Zod pour les notes de consultation (story 9.1).
 *
 * Validation isomorphe : utilisée côté client (react-hook-form / formulaire)
 * et côté serveur (Server Actions) pour garantir des règles identiques.
 *
 * Sécurité (héritée 5.2) : `content` est trimé ; les inputs ne sont consommés
 * que via Prisma paramétré (aucune interpolation SQL brute).
 *
 * @module lib/validations/consultation-notes
 */

import { z } from "zod";

/** Longueur maximale du contenu d'une note (caractères). */
export const CONSULTATION_NOTE_MAX_LENGTH = 5000;

/**
 * Schéma de validation d'une note de consultation.
 *
 * Règles :
 * - `content` : trimé, non vide, ≤ 5000 caractères.
 * - `appointmentId` : optionnel ; s'il est fourni, UUID valide. Une chaîne vide
 *   est normalisée en `undefined` (note non rattachée à un RDV).
 */
export const consultationNoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "La note ne peut pas être vide")
    .max(
      CONSULTATION_NOTE_MAX_LENGTH,
      `La note ne peut pas dépasser ${CONSULTATION_NOTE_MAX_LENGTH} caractères`
    ),
  appointmentId: z
    .string()
    .uuid("L'identifiant de rendez-vous n'est pas valide")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/**
 * Type dérivé du schéma `consultationNoteSchema`.
 *
 * - Côté client : `useForm<ConsultationNoteFormValues>()`
 * - Côté serveur : paramètre `data: ConsultationNoteFormValues`
 */
export type ConsultationNoteFormValues = z.infer<typeof consultationNoteSchema>;
