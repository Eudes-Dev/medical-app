/**
 * Tests unitaires du module de chiffrement applicatif (story 11.4).
 *
 * Scénarios 11.4-UNIT-001 à 11.4-UNIT-010. Le module est testé **en vrai**
 * (node:crypto) en posant/retirant `process.env.DATA_ENCRYPTION_KEY`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";

import {
  encryptField,
  decryptField,
  isEncrypted,
  isEncryptionEnabled,
  ENVELOPE_PREFIX,
} from "@/lib/security/crypto";

const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");

const ORIGINAL_KEY = process.env.DATA_ENCRYPTION_KEY;

function setKey(value: string | undefined) {
  if (value === undefined) {
    delete process.env.DATA_ENCRYPTION_KEY;
  } else {
    process.env.DATA_ENCRYPTION_KEY = value;
  }
}

beforeEach(() => {
  // Par défaut : pas de clé (chiffrement désactivé).
  setKey(undefined);
});

afterEach(() => {
  setKey(ORIGINAL_KEY);
});

describe("crypto — clé activée", () => {
  beforeEach(() => setKey(KEY_A));

  it("11.4-UNIT-001: round-trip clair → chiffré → clair", () => {
    const plain = "Patient allergique à la pénicilline.";
    const enc = encryptField(plain);
    expect(enc).not.toBe(plain);
    expect(isEncrypted(enc)).toBe(true);
    expect(enc.startsWith(ENVELOPE_PREFIX)).toBe(true);
    expect(decryptField(enc)).toBe(plain);
  });

  it("11.4-UNIT-002: IV aléatoire → deux chiffrés diffèrent mais déchiffrent pareil", () => {
    const plain = "Tension 12/8, RAS.";
    const a = encryptField(plain);
    const b = encryptField(plain);
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(plain);
    expect(decryptField(b)).toBe(plain);
  });

  it("11.4-UNIT-003: chaînes limites (vide, accents, multi-lignes, longue)", () => {
    const cases = [
      "",
      "Éàùçôœ — caractères accentués",
      "Ligne 1\nLigne 2\nLigne 3",
      "x".repeat(5000),
      "🩺💊 emojis cliniques",
    ];
    for (const plain of cases) {
      expect(decryptField(encryptField(plain))).toBe(plain);
    }
  });

  it("11.4-UNIT-004: legacy en clair lu tel quel même clé activée", () => {
    expect(decryptField("note en clair historique")).toBe(
      "note en clair historique"
    );
    expect(isEncrypted("note en clair historique")).toBe(false);
  });

  it("11.4-UNIT-005: enveloppe altérée (ciphertext modifié) → lève", () => {
    const enc = encryptField("secret médical");
    // Modifie le dernier caractère du ciphertext.
    const tampered = enc.slice(0, -1) + (enc.endsWith("A") ? "B" : "A");
    expect(() => decryptField(tampered)).toThrow();
  });

  it("11.4-UNIT-006: mauvaise clé → lève (échec d'authentification GCM)", () => {
    const enc = encryptField("secret médical");
    setKey(KEY_B);
    expect(() => decryptField(enc)).toThrow();
  });

  it("11.4-UNIT-007: enveloppe malformée (segments manquants) → lève", () => {
    expect(() => decryptField(ENVELOPE_PREFIX + "abc")).toThrow();
    expect(() => decryptField(ENVELOPE_PREFIX + "a:b")).toThrow();
  });

  it("11.4-UNIT-008: isEncryptionEnabled vrai avec clé valide", () => {
    expect(isEncryptionEnabled()).toBe(true);
  });
});

describe("crypto — clé désactivée (absente/invalide)", () => {
  it("11.4-UNIT-009: sans clé → encrypt passe-plat, decrypt passe-plat sur clair", () => {
    setKey(undefined);
    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptField("contenu")).toBe("contenu");
    expect(decryptField("contenu")).toBe("contenu");
  });

  it("11.4-UNIT-010: clé de longueur invalide → désactivé", () => {
    setKey(Buffer.from("trop court").toString("base64")); // < 32 octets
    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptField("contenu")).toBe("contenu");
  });

  it("11.4-UNIT-011: donnée chiffrée + clé absente → decrypt lève", () => {
    // Chiffre avec une clé valide…
    setKey(KEY_A);
    const enc = encryptField("secret");
    // …puis retire la clé : la valeur est illisible (jamais renvoyée brute).
    setKey(undefined);
    expect(() => decryptField(enc)).toThrow();
  });
});
