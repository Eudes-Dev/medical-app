/**
 * Tests unitaires de la validation des variables d'environnement de production (story 13.2).
 *
 * Test IDs: 13.2-UNIT-001..006
 * Level: Unit (aucune base, aucun mock — fonction pure, env injecté)
 */

import { describe, it, expect } from "vitest";

import {
  ENV_VARS,
  REQUIRED_PRODUCTION_KEYS,
  validateProductionEnv,
  type EnvLike,
} from "@/lib/config/required-env";

/** Construit un environnement où toutes les variables obligatoires sont renseignées. */
function fullProductionEnv(): EnvLike {
  const env: EnvLike = {};
  for (const key of REQUIRED_PRODUCTION_KEYS) {
    env[key] = `value-for-${key}`;
  }
  return env;
}

describe("required-env — inventaire", () => {
  it("13.2-UNIT-001: les clés obligatoires sont un sous-ensemble cohérent de l'inventaire", () => {
    expect(REQUIRED_PRODUCTION_KEYS.length).toBeGreaterThan(0);
    for (const key of REQUIRED_PRODUCTION_KEYS) {
      const spec = ENV_VARS.find((v) => v.key === key);
      expect(spec).toBeDefined();
      expect(spec?.requiredInProduction).toBe(true);
    }
  });

  it("13.2-UNIT-002: l'inventaire couvre les secrets de sécurité critiques", () => {
    // Garde-fou : ces variables ne doivent jamais redevenir optionnelles par mégarde.
    expect(REQUIRED_PRODUCTION_KEYS).toContain("DATA_ENCRYPTION_KEY");
    expect(REQUIRED_PRODUCTION_KEYS).toContain("JWT_SECRET");
    expect(REQUIRED_PRODUCTION_KEYS).toContain("CRON_SECRET");
    expect(REQUIRED_PRODUCTION_KEYS).toContain("DATABASE_URL");
    expect(REQUIRED_PRODUCTION_KEYS).toContain("DIRECT_URL");
  });
});

describe("validateProductionEnv", () => {
  it("13.2-UNIT-003: environnement complet → ok, aucune manquante", () => {
    const result = validateProductionEnv(fullProductionEnv());
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.empty).toEqual([]);
  });

  it("13.2-UNIT-004: variable obligatoire absente → détectée dans missing", () => {
    const env = fullProductionEnv();
    delete env.DATABASE_URL;
    const result = validateProductionEnv(env);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("DATABASE_URL");
    expect(result.empty).not.toContain("DATABASE_URL");
  });

  it("13.2-UNIT-005: variable présente mais vide/espaces → détectée dans empty", () => {
    const env = fullProductionEnv();
    env.JWT_SECRET = "";
    env.CRON_SECRET = "   ";
    const result = validateProductionEnv(env);
    expect(result.ok).toBe(false);
    expect(result.empty).toEqual(expect.arrayContaining(["JWT_SECRET", "CRON_SECRET"]));
    expect(result.missing).not.toContain("JWT_SECRET");
  });

  it("13.2-UNIT-006: variables optionnelles absentes → tolérées (ok)", () => {
    // Un env complet n'inclut AUCUNE variable optionnelle (Twilio, bucket, slug…).
    const env = fullProductionEnv();
    expect(env.SMS_ENABLED).toBeUndefined();
    expect(env.SUPABASE_MEDICAL_DOCS_BUCKET).toBeUndefined();
    const result = validateProductionEnv(env);
    expect(result.ok).toBe(true);
  });
});
