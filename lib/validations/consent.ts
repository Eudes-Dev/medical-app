/**
 * Schémas de validation Zod pour le consentement RGPD (story 11.1).
 *
 * Validation isomorphe : utilisée côté client (formulaire) et côté serveur
 * (Server Actions) pour garantir des règles identiques.
 *
 * Sécurité (héritée 5.2) : `note` est trimée ; les inputs ne sont consommés que
 * via Prisma paramétré (aucune interpolation SQL brute). Ce module est
 * volontairement **pur** (aucun import Prisma/Supabase) pour être testable en
 * unit sans base.
 *
 * @module lib/validations/consent
 */

import { z } from "zod";

/** Longueur maximale d'une note de contexte de consentement (caractères). */
export const CONSENT_NOTE_MAX_LENGTH = 500;

/**
 * Version courante de la politique de confidentialité.
 *
 * Figée sur chaque consentement accordé (`ConsentRecord.policyVersion`) afin de
 * tracer **à quelle version** le patient a consenti. À incrémenter lors d'une
 * mise à jour matérielle de la politique RGPD.
 */
export const CONSENT_POLICY_VERSION = "2026-06";

/**
 * Finalités de traitement couvertes par un consentement, dans l'ordre
 * d'affichage souhaité.
 *
 * Doit rester synchronisé avec l'enum Prisma `ConsentType`.
 */
export const CONSENT_TYPES = [
  "DATA_PROCESSING",
  "HEALTH_DATA",
  "COMMUNICATION",
] as const;

/** Type union des finalités de consentement. */
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Libellés FR courts des finalités (réutilisables côté UI). */
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  DATA_PROCESSING: "Données personnelles",
  HEALTH_DATA: "Données de santé",
  COMMUNICATION: "Communications",
};

/** Finalité détaillée FR par type (affichée sous le libellé). */
export const CONSENT_TYPE_DESCRIPTIONS: Record<ConsentType, string> = {
  DATA_PROCESSING:
    "Traitement des données personnelles pour la gestion du dossier et des rendez-vous.",
  HEALTH_DATA:
    "Traitement des données de santé (art. 9 RGPD) — consentement explicite requis.",
  COMMUNICATION:
    "Envoi de rappels et de communications par email ou SMS.",
};

/**
 * Schéma de validation d'une saisie de consentement.
 *
 * Règles :
 * - `type` : ∈ valeurs de l'enum `ConsentType`.
 * - `granted` : booléen (true = accordé, false = retiré).
 * - `note` : optionnelle, trimée, ≤ 500 caractères. La chaîne vide est
 *   normalisée en `undefined` (absence de note).
 */
export const consentInputSchema = z.object({
  type: z.enum(CONSENT_TYPES, {
    message: "La finalité de consentement n'est pas valide",
  }),
  granted: z.boolean(),
  note: z
    .string()
    .trim()
    .max(
      CONSENT_NOTE_MAX_LENGTH,
      `La note ne peut pas dépasser ${CONSENT_NOTE_MAX_LENGTH} caractères`
    )
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

/**
 * Type d'**entrée** du schéma `consentInputSchema` (ce que les appelants
 * fournissent). `note` y est optionnelle (le schéma normalise la chaîne vide en
 * `undefined`), contrairement au type de sortie `z.infer` où elle serait requise.
 *
 * - Côté client : `useState` / formulaire
 * - Côté serveur : paramètre `input: ConsentInput`
 */
export type ConsentInput = z.input<typeof consentInputSchema>;
