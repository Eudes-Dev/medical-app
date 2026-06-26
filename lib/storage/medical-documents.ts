/**
 * Abstraction de stockage des documents médicaux sur Supabase Storage (story 9.2).
 *
 * Conformément à l'ADR docs/architecture/5-stockage-fichiers-decision.md :
 *  - bucket **privé** (`SUPABASE_MEDICAL_DOCS_BUCKET`, défaut `medical-documents`) ;
 *  - aucune URL publique : lecture/upload via **URL signées courtes** ;
 *  - cette couche est volontairement fine pour être **mockable** en test
 *    (exactement comme `@/lib/prisma`).
 *
 * ⚠️ La création du bucket et la configuration des politiques RLS/Storage sont une
 * étape ops humaine (hors boucle BMAD — cf. ADR §5, garde-fou déploiement).
 *
 * @module lib/storage/medical-documents
 */

import { createClient } from "@/lib/supabase/server";

/** Nom du bucket privé des documents médicaux. */
export const MEDICAL_DOCS_BUCKET =
  process.env.SUPABASE_MEDICAL_DOCS_BUCKET ?? "medical-documents";

/** TTL par défaut d'une URL de lecture signée (secondes). */
export const SIGNED_URL_TTL_SECONDS = 60;

/** Informations nécessaires au client pour uploader le binaire. */
export type UploadTarget = {
  /** Jeton d'upload signé (à passer à `uploadToSignedUrl`). */
  token: string;
  /** URL d'upload signée. */
  signedUrl: string;
};

/**
 * Crée une URL d'upload signée pour déposer le binaire à `path`.
 *
 * @throws {Error} Si Supabase Storage renvoie une erreur.
 */
export async function createUploadUrl(path: string): Promise<UploadTarget> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MEDICAL_DOCS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(
      `Storage: échec de création de l'URL d'upload (${
        error?.message ?? "réponse vide"
      })`
    );
  }
  return { token: data.token, signedUrl: data.signedUrl };
}

/**
 * Crée une URL de lecture signée (TTL court) pour télécharger l'objet `path`.
 *
 * @throws {Error} Si Supabase Storage renvoie une erreur.
 */
export async function createDownloadUrl(
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MEDICAL_DOCS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(
      `Storage: échec de création de l'URL de téléchargement (${
        error?.message ?? "réponse vide"
      })`
    );
  }
  return data.signedUrl;
}

/**
 * Supprime l'objet `path` du bucket.
 *
 * @throws {Error} Si Supabase Storage renvoie une erreur.
 */
export async function removeObject(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(MEDICAL_DOCS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Storage: échec de suppression de l'objet (${error.message})`);
  }
}

/**
 * Supprime un **lot** d'objets du bucket (droit à l'oubli — story 11.2).
 *
 * No-op si la liste est vide (évite un appel réseau inutile). Utilisée par
 * l'effacement RGPD d'un patient pour purger en une fois tous ses documents.
 *
 * @throws {Error} Si Supabase Storage renvoie une erreur.
 */
export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(MEDICAL_DOCS_BUCKET)
    .remove(paths);

  if (error) {
    throw new Error(
      `Storage: échec de suppression des objets (${error.message})`
    );
  }
}
