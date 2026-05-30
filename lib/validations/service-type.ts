/**
 * Schéma Zod du catalogue des types de soins `ServiceType` (story 7.3, AC 8).
 *
 * Utilisé côté serveur (`createServiceType`/`updateServiceType` — défense en
 * profondeur) ET côté client (`service-type-form` — feedback inline), conforme
 * à la convention projet de double validation.
 *
 * @module lib/validations/service-type
 */

import { z } from "zod";
import { SERVICE_COLOR_IDS } from "@/lib/cabinet/service-colors";

/** Durées de soin autorisées (en minutes) — détermine `Appointment.endTime`. */
export const SERVICE_DURATIONS = [15, 30, 45, 60, 90] as const;

/** Longueur maximale de la description publique (AC 2). */
export const SERVICE_DESCRIPTION_MAX_LENGTH = 500;

/**
 * Un type de soin paramétrable :
 * - `label`       : 2–60 caractères après trim.
 * - `durationMin` : entier ∈ {15,30,45,60,90}.
 * - `color`       : identifiant de la palette restreinte (8 jetons).
 * - `price`       : optionnel, ≥ 0, 2 décimales max (euros).
 * - `description` : optionnelle, ≤ 500 caractères après trim.
 * - `isPublic`    : visible dans le tunnel public.
 * - `active`      : utilisable (false = archivé sans suppression).
 */
export const serviceTypeSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Libellé requis (min. 2 caractères)")
    .max(60, "Libellé trop long (max. 60 caractères)"),
  durationMin: z
    .number()
    .int()
    .refine(
      (n) =>
        SERVICE_DURATIONS.includes(n as (typeof SERVICE_DURATIONS)[number]),
      { message: "Durée invalide (15, 30, 45, 60 ou 90 min)." },
    ),
  color: z.enum(SERVICE_COLOR_IDS, {
    error: "Couleur invalide.",
  }),
  price: z
    .number()
    .min(0, "Le tarif doit être positif.")
    // 2 décimales max : la valeur doit être inchangée après arrondi au centime
    // (robuste aux flottants, ex. 19.99 ok, 19.999 rejeté).
    .refine((n) => Math.round(n * 100) / 100 === n, {
      message: "Tarif invalide (2 décimales maximum).",
    })
    .optional(),
  description: z
    .string()
    .trim()
    .max(
      SERVICE_DESCRIPTION_MAX_LENGTH,
      `Description limitée à ${SERVICE_DESCRIPTION_MAX_LENGTH} caractères.`,
    )
    .optional(),
  isPublic: z.boolean(),
  active: z.boolean(),
});

/** Valeurs validées (sortie). */
export type ServiceTypeValues = z.infer<typeof serviceTypeSchema>;
/** Valeurs d'entrée (avant transformation/coercition). */
export type ServiceTypeInput = z.input<typeof serviceTypeSchema>;
