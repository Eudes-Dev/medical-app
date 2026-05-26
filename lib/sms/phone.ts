/**
 * Helpers de validation et formatage des numéros de téléphone (story 6.3).
 *
 * - `toE164` : parse un numéro libre (avec/sans indicatif, espaces, tirets)
 *   et renvoie le format E.164 ("+33612345678") ou `null` si invalide.
 * - `isMobileFR` : true si le numéro est un mobile FR (+336, +337).
 * - `getPatientSmsTarget` : combine les deux — renvoie le numéro E.164 si
 *   c'est un mobile FR valide, sinon null. Utilisé pour décider si on
 *   envoie un SMS au patient.
 *
 * @module lib/sms/phone
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Parse un numéro de téléphone et retourne le format E.164.
 * Retourne null si le numéro est invalide.
 *
 * @example
 * toE164("0612345678") // "+33612345678"
 * toE164("+33612345678") // "+33612345678" (idempotent)
 * toE164("06 12 34 56 78") // "+33612345678" (espaces tolérés)
 * toE164("abc") // null
 */
export function toE164(raw: string, region: "FR" = "FR"): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw, region);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Détecte si un numéro E.164 est un mobile français.
 * Les mobiles FR commencent par +336 ou +337.
 *
 * @example
 * isMobileFR("+33612345678") // true
 * isMobileFR("+33145678901") // false (fixe parisien)
 */
export function isMobileFR(e164: string): boolean {
  return /^\+33[67]\d{8}$/.test(e164);
}

/**
 * Détermine le numéro E.164 cible pour un SMS.
 * Retourne le numéro normalisé si c'est un mobile FR valide, null sinon.
 *
 * Utilisé comme garde d'entrée pour `sendSms` — si null, ne pas envoyer.
 */
export function getPatientSmsTarget(patient: { phone: string }): string | null {
  const e164 = toE164(patient.phone);
  return e164 && isMobileFR(e164) ? e164 : null;
}
