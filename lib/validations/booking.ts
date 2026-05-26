/**
 * Schémas de validation Zod pour le tunnel de réservation publique (Story 4.2).
 *
 * Utilisés côté client (`react-hook-form` + `zodResolver`) ET côté serveur
 * (Server Action `createGuestBooking`) pour la double validation.
 *
 * @module lib/validations/booking
 */

import { z } from "zod";

/**
 * Format téléphone français : 10 chiffres locaux (`0X XX XX XX XX`)
 * ou international (`+33 X XX XX XX XX`). Tolère espaces, points et tirets.
 */
const FR_PHONE_REGEX = /^(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

/**
 * Schéma de validation des coordonnées d'un patient invité au moment
 * de la finalisation de la réservation.
 *
 * Sécurité (story 5.2) : tous les champs texte sont trimés ; les inputs
 * sont consommés via Prisma (paramétré), aucune interpolation SQL brute.
 *
 * Règles:
 * - `firstName` / `lastName` : 2 à 50 caractères après trim
 * - `phone`        : format FR (10 chiffres ou +33)
 * - `email`        : adresse valide, normalisée en lowercase
 * - `slotISO`      : ISO 8601 avec offset, strictement dans le futur
 */
export const guestBookingSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Prénom requis (min. 2 caractères)")
    .max(50, "Prénom trop long (max. 50 caractères)"),
  lastName: z
    .string()
    .trim()
    .min(2, "Nom requis (min. 2 caractères)")
    .max(50, "Nom trop long (max. 50 caractères)"),
  phone: z
    .string()
    .trim()
    .regex(FR_PHONE_REGEX, "Téléphone français invalide"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  slotISO: z
    .string()
    .datetime({ offset: true, message: "Créneau invalide" })
    .refine((s) => new Date(s) > new Date(), {
      message: "Le créneau doit être dans le futur",
    }),
});

export type GuestBookingValues = z.infer<typeof guestBookingSchema>;
