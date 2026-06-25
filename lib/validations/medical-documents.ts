/**
 * Schémas de validation Zod + helpers de chemin pour les documents médicaux
 * (story 9.2).
 *
 * Validation isomorphe : utilisée côté client (formulaire) et côté serveur
 * (Server Actions) pour garantir des règles identiques.
 *
 * ⚠️ Ce module est volontairement **pur** (aucun import Supabase/Prisma) afin
 * d'être testable en unit sans base ni storage.
 *
 * Sécurité (héritée 5.2 + ADR §5) : allowlist MIME stricte, plafond de taille,
 * chemin de stockage **dérivé du mime** (jamais du nom de fichier) — anti-traversal.
 *
 * @module lib/validations/medical-documents
 */

import { z } from "zod";

/** Taille maximale d'un document (10 Mo en octets). */
export const MEDICAL_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Longueur maximale du nom de fichier d'origine (caractères). */
export const MEDICAL_DOCUMENT_MAX_FILENAME_LENGTH = 255;

/**
 * Allowlist des types MIME acceptés → extension de fichier associée.
 *
 * L'extension du chemin de stockage est dérivée de cette table (et NON du nom
 * de fichier utilisateur), ce qui élimine tout risque de path traversal.
 */
export const MEDICAL_DOCUMENT_ALLOWED_MIME = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

/** Type union des MIME autorisés. */
export type MedicalDocumentMime = keyof typeof MEDICAL_DOCUMENT_ALLOWED_MIME;

/** Valeurs de l'enum Prisma `MedicalDocumentCategory`. */
export const MEDICAL_DOCUMENT_CATEGORIES = [
  "PRESCRIPTION",
  "REPORT",
  "IMAGING",
  "ANALYSIS",
  "OTHER",
] as const;

/** Type union des catégories de document. */
export type MedicalDocumentCategoryValue =
  (typeof MEDICAL_DOCUMENT_CATEGORIES)[number];

/** Libellés FR des catégories (UI). */
export const MEDICAL_DOCUMENT_CATEGORY_LABELS: Record<
  MedicalDocumentCategoryValue,
  string
> = {
  PRESCRIPTION: "Ordonnance",
  REPORT: "Compte rendu",
  IMAGING: "Imagerie",
  ANALYSIS: "Analyses",
  OTHER: "Autre",
};

/**
 * Schéma de validation des **métadonnées** d'un document médical.
 *
 * Règles :
 * - `fileName` : trimé, non vide, ≤ 255 caractères.
 * - `mimeType` : strictement dans l'allowlist.
 * - `sizeBytes` : entier > 0 et ≤ 10 Mo.
 * - `category` : valeur de l'enum.
 *
 * Le binaire lui-même n'est jamais validé/transporté ici (il est uploadé
 * séparément vers une URL signée).
 */
export const medicalDocumentSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "Le nom du fichier est requis")
    .max(
      MEDICAL_DOCUMENT_MAX_FILENAME_LENGTH,
      `Le nom du fichier ne peut pas dépasser ${MEDICAL_DOCUMENT_MAX_FILENAME_LENGTH} caractères`
    ),
  mimeType: z.enum(
    Object.keys(MEDICAL_DOCUMENT_ALLOWED_MIME) as [
      MedicalDocumentMime,
      ...MedicalDocumentMime[],
    ],
    { message: "Type de fichier non autorisé (PDF, JPEG ou PNG attendu)" }
  ),
  sizeBytes: z
    .number()
    .int("La taille du fichier est invalide")
    .positive("Le fichier est vide")
    .max(
      MEDICAL_DOCUMENT_MAX_SIZE_BYTES,
      "Le fichier dépasse la taille maximale autorisée (10 Mo)"
    ),
  category: z.enum(MEDICAL_DOCUMENT_CATEGORIES, {
    message: "Catégorie de document invalide",
  }),
});

/**
 * Type dérivé du schéma `medicalDocumentSchema`.
 *
 * - Côté client : construction de la métadonnée à partir du `File` sélectionné.
 * - Côté serveur : paramètre `meta: MedicalDocumentFormValues`.
 */
export type MedicalDocumentFormValues = z.infer<typeof medicalDocumentSchema>;

/**
 * Construit un chemin de stockage sûr pour un document médical.
 *
 * Format : `patients/{patientId}/{uuidV4}.{ext}` où l'extension est **dérivée
 * du type MIME** (allowlist) et non du nom de fichier utilisateur. Aucun
 * segment fourni par l'utilisateur n'entre dans le chemin (anti-traversal).
 *
 * @param patientId UUID du patient propriétaire (doit déjà être validé).
 * @param mimeType Type MIME (doit appartenir à l'allowlist).
 */
export function buildMedicalDocumentPath(
  patientId: string,
  mimeType: MedicalDocumentMime
): string {
  const ext = MEDICAL_DOCUMENT_ALLOWED_MIME[mimeType];
  return `patients/${patientId}/${crypto.randomUUID()}.${ext}`;
}
