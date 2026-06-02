/**
 * Schéma de validation Zod du profil public du cabinet (story 7.4).
 *
 * Utilisé côté serveur (`updateCabinetProfile` — défense en profondeur) ET côté
 * client (feedback inline dans `cabinet-profile-form`) pour la double validation,
 * conforme à la convention projet.
 *
 * Le téléphone est validé via l'utilitaire FR existant (`libphonenumber-js`,
 * `lib/sms/phone`) plutôt qu'une regex, pour rester cohérent avec le tunnel/SMS.
 *
 * @module lib/validations/cabinet-profile
 */

import { z } from "zod";
import { toE164 } from "@/lib/sms/phone";

/** Bornes de longueur des champs (réutilisées par le formulaire pour `maxLength`). */
export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 80;
export const PROFILE_TAGLINE_MAX_LENGTH = 120;
export const PROFILE_DESCRIPTION_MAX_LENGTH = 1000;
export const PROFILE_ADDRESS_MIN_LENGTH = 2;
export const PROFILE_ADDRESS_MAX_LENGTH = 200;
export const PROFILE_ACCESS_INFO_MAX_LENGTH = 500;

/**
 * Champ texte optionnel : on `trim`, et une chaîne vide devient `undefined`
 * (un optionnel non renseigné ne doit pas persister `""`).
 */
const optionalTrimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} ne doit pas dépasser ${max} caractères.`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const cabinetProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(PROFILE_NAME_MIN_LENGTH, "Le nom doit comporter au moins 2 caractères.")
    .max(
      PROFILE_NAME_MAX_LENGTH,
      `Le nom ne doit pas dépasser ${PROFILE_NAME_MAX_LENGTH} caractères.`,
    ),
  tagline: optionalTrimmed(PROFILE_TAGLINE_MAX_LENGTH, "L'accroche"),
  description: optionalTrimmed(PROFILE_DESCRIPTION_MAX_LENGTH, "La présentation"),
  address: z
    .string()
    .trim()
    .min(
      PROFILE_ADDRESS_MIN_LENGTH,
      "L'adresse doit comporter au moins 2 caractères.",
    )
    .max(
      PROFILE_ADDRESS_MAX_LENGTH,
      `L'adresse ne doit pas dépasser ${PROFILE_ADDRESS_MAX_LENGTH} caractères.`,
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Le téléphone est requis.")
    .refine((v) => toE164(v) !== null, {
      message: "Numéro de téléphone invalide (format français attendu).",
    }),
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  accessInfo: optionalTrimmed(PROFILE_ACCESS_INFO_MAX_LENGTH, "Les infos d'accès"),
});

/** Type des valeurs **validées** (sortie : optionnels normalisés en `undefined`). */
export type CabinetProfileValues = z.infer<typeof cabinetProfileSchema>;

/** Type d'**entrée** (avant parse) : les champs optionnels sont réellement optionnels. */
export type CabinetProfileInput = z.input<typeof cabinetProfileSchema>;
