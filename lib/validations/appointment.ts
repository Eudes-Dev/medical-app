/**
 * Schémas de validation Zod pour les rendez-vous (Story 3.3).
 *
 * Ce module définit les schémas utilisés côté formulaire (startTime + duration)
 * et côté Server Actions. La conversion startTime + duration → startTime/endTime
 * pour Prisma est effectuée dans les actions.
 *
 * @module lib/validations/appointment
 */

import { z } from "zod";

/** Durées de consultation autorisées (en minutes). */
export const APPOINTMENT_DURATIONS = [15, 30, 45, 60] as const;

/** Types de consultation proposés dans le formulaire. */
export const APPOINTMENT_TYPES = [
  "Première consultation",
  "Suivi",
  "Urgence",
] as const;

/**
 * Schéma de validation pour la création / modification d'un rendez-vous.
 *
 * Côté formulaire on utilise startTime + duration ; la Server Action
 * calcule endTime = startTime + duration pour Prisma.
 *
 * Règles:
 * - patientId: string UUID requis
 * - startTime: date requise, doit être dans le futur (au moment de la validation)
 * - duration: 15, 30, 45 ou 60 minutes
 * - type: l'un des types prédéfinis
 * - notes: optionnel, max 500 caractères
 */
export const appointmentSchema = z.object({
  /** ID du patient sélectionné */
  patientId: z.string().min(1, "Veuillez sélectionner un patient"),
  /** Date et heure de début du rendez-vous */
  startTime: z
    .date({ required_error: "La date et l'heure de début sont requises" })
    .refine((d) => d.getTime() > Date.now(), {
      message: "Le rendez-vous doit être dans le futur",
    }),
  /** Durée en minutes (15, 30, 45, 60) — accepte number ou string (select HTML) */
  duration: z.coerce
    .number()
    .refine((n) => APPOINTMENT_DURATIONS.includes(n as (typeof APPOINTMENT_DURATIONS)[number]), {
      message: "Veuillez choisir une durée (15, 30, 45 ou 60 min)",
    }),
  /** Type de consultation */
  type: z.enum(APPOINTMENT_TYPES, {
    errorMap: () => ({ message: "Veuillez choisir un type de consultation" }),
  }),
  /** Notes optionnelles, limitées à 500 caractères */
  notes: z
    .string()
    .max(500, "Les notes ne peuvent pas dépasser 500 caractères")
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : v)),
});

/** Type inféré pour les valeurs du formulaire rendez-vous */
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
