/**
 * Chiffrement applicatif de champ au repos (story 11.4, ADR §6).
 *
 * Couche d'infrastructure encapsulant `node:crypto` pour chiffrer/déchiffrer des
 * champs texte sensibles (données de santé, art. 9 RGPD) au format **enveloppe
 * authentifiée AES-256-GCM**, en défense en profondeur du chiffrement disque du
 * fournisseur (Supabase/Postgres).
 *
 * Format d'enveloppe (versionné, auto-descriptif) :
 *
 *   enc:v1:<base64url(iv)>:<base64url(authTag)>:<base64url(ciphertext)>
 *
 * Propriétés clés (cf. docs/architecture/6-chiffrement-applicatif-decision.md) :
 *  - AES-256-GCM : confidentialité **et** intégrité (le tag authentifie ; toute
 *    altération du ciphertext/tag fait échouer le déchiffrement).
 *  - IV aléatoire 12 octets par valeur → deux chiffrements du même clair diffèrent.
 *  - Rétro-compatible : `decryptField` renvoie la valeur telle quelle si elle n'est
 *    pas au format `enc:v1:` (legacy en clair lisible) ; `encryptField` chiffre
 *    toujours (si activé). Aucune migration de schéma requise.
 *  - Clé via `DATA_ENCRYPTION_KEY` (32 octets base64). **Sans clé → chiffrement
 *    désactivé** (passe-plat) pour dev/preview/tests. **Obligatoire en production.**
 *  - Donnée chiffrée sans clé / clé erronée / donnée altérée → `decryptField`
 *    **lève** (jamais de contenu corrompu renvoyé silencieusement).
 *
 * Module mockable en test exactement comme `@/lib/storage/medical-documents` ou
 * `@/lib/server/audit`.
 *
 * @module lib/security/crypto
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

/** Préfixe d'enveloppe versionné (auto-descriptif). */
export const ENVELOPE_PREFIX = "enc:v1:";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Charge la clé maîtresse depuis `DATA_ENCRYPTION_KEY` (base64).
 *
 * Lue **à chaque appel** (pas de cache module) afin que les tests puissent
 * activer/désactiver le chiffrement en mutant `process.env`.
 *
 * @returns Le `Buffer` de 32 octets si la clé est présente et valide, sinon `null`.
 */
function loadKey(): Buffer | null {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw || raw.trim() === "") return null;

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    return null;
  }

  return key.length === KEY_BYTES ? key : null;
}

/**
 * Indique si le chiffrement applicatif est activé (clé présente et valide).
 */
export function isEncryptionEnabled(): boolean {
  return loadKey() !== null;
}

/**
 * Indique si une valeur est une enveloppe chiffrée (préfixe `enc:v1:`).
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX);
}

/**
 * Chiffre une valeur texte en enveloppe AES-256-GCM.
 *
 * Si aucune clé n'est configurée, renvoie le clair **inchangé** (passe-plat —
 * chiffrement désactivé).
 */
export function encryptField(plaintext: string): string {
  const key = loadKey();
  if (key === null) return plaintext;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return (
    ENVELOPE_PREFIX +
    iv.toString("base64url") +
    ":" +
    authTag.toString("base64url") +
    ":" +
    ciphertext.toString("base64url")
  );
}

/**
 * Déchiffre une enveloppe AES-256-GCM.
 *
 * - Valeur non chiffrée (sans préfixe `enc:v1:`) → renvoyée **telle quelle**
 *   (legacy en clair, lecture tolérante).
 * - Valeur chiffrée mais clé absente → **lève** (donnée illisible sans clé).
 * - Enveloppe malformée, ciphertext/tag altéré ou mauvaise clé → **lève**
 *   (échec d'authentification GCM ou de parsing).
 *
 * @throws {Error} Si la valeur est chiffrée mais ne peut être déchiffrée.
 */
export function decryptField(value: string): string {
  if (!isEncrypted(value)) return value;

  const key = loadKey();
  if (key === null) {
    throw new Error(
      "[crypto] Valeur chiffrée mais DATA_ENCRYPTION_KEY absente : déchiffrement impossible."
    );
  }

  const body = value.slice(ENVELOPE_PREFIX.length);
  const segments = body.split(":");
  if (segments.length !== 3) {
    throw new Error("[crypto] Enveloppe chiffrée malformée (segments invalides).");
  }

  const [ivPart, tagPart, ctPart] = segments;
  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(ctPart, "base64url");

  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
    throw new Error("[crypto] Enveloppe chiffrée malformée (IV/tag invalides).");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
