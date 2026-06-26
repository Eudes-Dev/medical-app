/**
 * Inventaire et validation des variables d'environnement de production (story 13.2).
 *
 * Module **pur** (aucune base, aucun appel réseau, aucun effet de bord) destiné à
 * outiller le déploiement Vercel : il déclare quelles variables sont *obligatoires en
 * production* et fournit une validation testable consommée par `scripts/check-prod-env.ts`.
 *
 * Il n'est volontairement **pas** branché comme porte de `next build` : un preview Vercel
 * sans secrets ne doit pas voir son build cassé. C'est un aide-ops exécuté à la demande
 * (`npm run check:prod-env`) et documenté dans `docs/ops/13.2-deploiement-vercel.md`.
 *
 * La liste reflète `.env.example`. La distinction requis/optionnel encode les replis du
 * code (ex. `SUPABASE_MEDICAL_DOCS_BUCKET` retombe sur "medical-documents") et les modules
 * désactivables (SMS Twilio gouverné par `SMS_ENABLED=false` par défaut).
 *
 * @module lib/config/required-env
 */

/** Représentation minimale d'un environnement (compatible `process.env`). */
export type EnvLike = Record<string, string | undefined>;

/** Description déclarative d'une variable d'environnement attendue. */
export interface EnvVarSpec {
  /** Nom de la variable (clé d'environnement). */
  readonly key: string;
  /** `true` si la variable est obligatoire pour un déploiement de production. */
  readonly requiredInProduction: boolean;
  /** Rôle de la variable (affiché dans le rapport du script). */
  readonly description: string;
}

/**
 * Inventaire des variables d'environnement de l'application, aligné sur `.env.example`.
 *
 * `requiredInProduction: false` ne signifie pas « inutile » mais « non bloquant » : la
 * variable a un repli côté code, ou appartient à un module désactivé par défaut.
 */
export const ENV_VARS: readonly EnvVarSpec[] = [
  // --- Base de données (Supabase / PostgreSQL) ---
  { key: "DATABASE_URL", requiredInProduction: true, description: "Connexion applicative (pooler PgBouncer)" },
  { key: "DIRECT_URL", requiredInProduction: true, description: "Connexion directe (migrations DDL)" },
  // --- Supabase Auth ---
  { key: "NEXT_PUBLIC_SUPABASE_URL", requiredInProduction: true, description: "URL du projet Supabase" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", requiredInProduction: true, description: "Clé anonyme Supabase (client)" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", requiredInProduction: true, description: "Clé service-role Supabase (serveur)" },
  // --- Sécurité applicative ---
  { key: "JWT_SECRET", requiredInProduction: true, description: "Signature du cookie booking_token (tunnel public 4.2)" },
  { key: "DATA_ENCRYPTION_KEY", requiredInProduction: true, description: "Clé AES-256-GCM du chiffrement clinique au repos (11.4)" },
  // --- URL publique & emails transactionnels ---
  { key: "NEXT_PUBLIC_APP_URL", requiredInProduction: true, description: "URL publique de l'app (liens emails 6.1)" },
  { key: "RESEND_API_KEY", requiredInProduction: true, description: "Clé API Resend (emails 6.1)" },
  { key: "EMAIL_FROM", requiredInProduction: true, description: "Adresse expéditrice des emails" },
  // --- Cron (rappels 6.2) ---
  { key: "CRON_SECRET", requiredInProduction: true, description: "Secret partagé Vercel Cron ↔ /api/cron/reminders (6.2)" },

  // --- Optionnelles (repli code ou module désactivé) ---
  { key: "SUPABASE_MEDICAL_DOCS_BUCKET", requiredInProduction: false, description: "Bucket documents médicaux (repli \"medical-documents\")" },
  { key: "NEXT_PUBLIC_CABINET_SLUG", requiredInProduction: false, description: "Slug cabinet pour liens internes (repli \"cabinet\")" },
  { key: "PRACTITIONER_NOTIFICATION_EMAIL", requiredInProduction: false, description: "Email praticien notifié des nouveaux RDV" },
  { key: "SMS_ENABLED", requiredInProduction: false, description: "Toggle module SMS Twilio (défaut false → no-op)" },
  { key: "TWILIO_ACCOUNT_SID", requiredInProduction: false, description: "SID Twilio (requis seulement si SMS_ENABLED=true)" },
  { key: "TWILIO_AUTH_TOKEN", requiredInProduction: false, description: "Token Twilio (requis seulement si SMS_ENABLED=true)" },
  { key: "TWILIO_PHONE_NUMBER", requiredInProduction: false, description: "Numéro émetteur Twilio (requis seulement si SMS_ENABLED=true)" },
  { key: "TWILIO_STATUS_WEBHOOK_SECRET", requiredInProduction: false, description: "Secret webhook statut Twilio" },
  // --- Monitoring Sentry (story 13.3, désactivable — no-op sans DSN) ---
  { key: "NEXT_PUBLIC_SENTRY_DSN", requiredInProduction: false, description: "DSN Sentry (client/serveur) — sans DSN, monitoring désactivé" },
  { key: "SENTRY_DSN", requiredInProduction: false, description: "DSN Sentry serveur (repli sur NEXT_PUBLIC_SENTRY_DSN)" },
  { key: "SENTRY_ENVIRONMENT", requiredInProduction: false, description: "Environnement Sentry (repli NODE_ENV)" },
  { key: "SENTRY_TRACES_SAMPLE_RATE", requiredInProduction: false, description: "Taux de traces Sentry ∈ [0,1] (défaut 0)" },
  { key: "SENTRY_AUTH_TOKEN", requiredInProduction: false, description: "Token upload source maps (build-time ; sans lui, upload désactivé)" },
  { key: "SENTRY_ORG", requiredInProduction: false, description: "Organisation Sentry (source maps)" },
  { key: "SENTRY_PROJECT", requiredInProduction: false, description: "Projet Sentry (source maps)" },
];

/** Liste des clés obligatoires en production. */
export const REQUIRED_PRODUCTION_KEYS: readonly string[] = ENV_VARS.filter(
  (v) => v.requiredInProduction,
).map((v) => v.key);

/** Résultat de la validation d'un environnement de production. */
export interface ProductionEnvValidation {
  /** `true` si aucune variable obligatoire n'est absente ou vide. */
  readonly ok: boolean;
  /** Clés obligatoires totalement absentes de l'environnement. */
  readonly missing: string[];
  /** Clés obligatoires présentes mais vides (ou uniquement des espaces). */
  readonly empty: string[];
}

/** Une valeur d'environnement est « renseignée » si elle existe et n'est pas vide après trim. */
function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * Valide qu'un environnement contient toutes les variables obligatoires en production.
 *
 * Fonction **pure** : ne lit pas `process.env` directement (l'appelant l'injecte), ne logge
 * rien, n'a aucun effet de bord. Distingue les clés *absentes* (`missing`) des clés *présentes
 * mais vides* (`empty`) pour un diagnostic précis. Les variables optionnelles sont ignorées.
 *
 * @param env Environnement à valider (typiquement `process.env`).
 * @returns Rapport `{ ok, missing, empty }`.
 */
export function validateProductionEnv(env: EnvLike): ProductionEnvValidation {
  const missing: string[] = [];
  const empty: string[] = [];

  for (const key of REQUIRED_PRODUCTION_KEYS) {
    if (!(key in env) || env[key] === undefined) {
      missing.push(key);
    } else if (isBlank(env[key])) {
      empty.push(key);
    }
  }

  return { ok: missing.length === 0 && empty.length === 0, missing, empty };
}
