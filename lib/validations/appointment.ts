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

/**
 * Durées de consultation autorisées (en minutes).
 * Étendu à 90 (story 7.3) pour couvrir toutes les durées de `ServiceType`
 * (`SERVICE_DURATIONS = {15,30,45,60,90}`).
 */
export const APPOINTMENT_DURATIONS = [15, 30, 45, 60, 90] as const;

/**
 * Types de consultation « legacy » (story 3.3). CONSERVÉ pour rétro-compatibilité
 * (back-fill / seeds / RDV antérieurs à 7.3). Depuis la story 7.3, le formulaire
 * dashboard ne s'appuie plus sur cette enum mais sur le catalogue dynamique
 * `ServiceType` ; `type` est désormais un **libellé-instantané** (snapshot) libre.
 */
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
 * - duration: 15, 30, 45, 60 ou 90 minutes
 * - serviceTypeId: UUID du type de soin (optionnel — story 7.3) ; quand fourni,
 *   l'action résout le service pour le snapshot `type` et la durée réelle.
 * - type: libellé-instantané (snapshot) optionnel ; conservé pour les RDV legacy
 *   et le repli quand aucun service n'est sélectionné.
 * - notes: optionnel, max 500 caractères
 *
 * Sécurité (story 5.2) : champs texte trimés ; les inputs sont consommés
 * exclusivement via Prisma (paramétré), aucune interpolation SQL brute.
 */
export const appointmentSchema = z.object({
  /** ID du patient sélectionné */
  patientId: z.string().trim().min(1, "Veuillez sélectionner un patient"),
  /** Date et heure de début du rendez-vous */
  startTime: z
    .date({ error: "La date et l'heure de début sont requises" })
    .refine((d) => d.getTime() > Date.now(), {
      message: "Le rendez-vous doit être dans le futur",
    }),
  /** Durée en minutes (15, 30, 45, 60, 90) — accepte number ou string (select HTML) */
  duration: z
    .number()
    .refine((n) => APPOINTMENT_DURATIONS.includes(n as (typeof APPOINTMENT_DURATIONS)[number]), {
      message: "Veuillez choisir une durée (15, 30, 45, 60 ou 90 min)",
    }),
  /** Type de soin sélectionné (story 7.3) — UUID optionnel. */
  serviceTypeId: z.string().uuid("Type de soin invalide").optional(),
  /** Libellé-instantané (snapshot) du type de consultation (≤ 60 car.). */
  type: z
    .string()
    .trim()
    .min(1, "Veuillez choisir un type de consultation")
    .max(60, "Libellé trop long (max. 60 caractères)")
    .optional(),
  /** Notes optionnelles, limitées à 500 caractères */
  notes: z
    .string()
    .trim()
    .max(500, "Les notes ne peuvent pas dépasser 500 caractères")
    .optional(),
});

/** Type inféré pour les valeurs du formulaire rendez-vous */
export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
