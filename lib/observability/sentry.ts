/**
 * Configuration d'observabilité Sentry — logique **pure**, testable et RGPD-safe (story 13.3).
 *
 * Ce module ne dépend PAS du SDK Sentry : il fournit la logique de décision (Sentry est-il
 * activé ?), de paramétrage (environnement, échantillonnage) et surtout **l'expurgation des
 * données patient** (`scrubSentryEvent`) consommée en `beforeSend` par les fichiers d'init.
 *
 * Principe d'activation (cohérent SMS_ENABLED / DATA_ENCRYPTION_KEY) : **désactivé par
 * défaut**. Sans DSN, aucun client Sentry n'est initialisé (no-op total). Voir
 * `docs/ops/13.3-monitoring-sentry.md`.
 *
 * Contrainte RGPD : l'application manipule des données de santé. `sendDefaultPii` est
 * `false` ET `scrubSentryEvent` retire (défense en profondeur) cookies, corps de requête,
 * en-têtes d'auth, identité utilisateur et tokens d'URL avant tout envoi.
 *
 * @module lib/observability/sentry
 */

/** Représentation minimale d'un environnement (compatible `process.env`). */
export type EnvLike = Record<string, string | undefined>;

/**
 * Forme minimale et tolérante d'un événement Sentry, suffisante pour l'expurgation sans
 * dépendre des types du SDK (qui restent compatibles en surface).
 */
export interface MinimalSentryEvent {
  user?: unknown;
  server_name?: unknown;
  request?: {
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, unknown>;
    query_string?: unknown;
    url?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Noms de query params à expurger (tokens / secrets transitant par l'URL). */
const SENSITIVE_QUERY_KEYS = ["token", "optouttoken", "access_token", "code", "secret"];

/** En-têtes de requête à retirer systématiquement. */
const SENSITIVE_HEADERS = ["cookie", "authorization", "x-supabase-auth", "proxy-authorization"];

/** Une valeur d'environnement est « renseignée » si elle existe et n'est pas vide après trim. */
function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * Résout le DSN Sentry à utiliser : `SENTRY_DSN` (serveur) en priorité, sinon
 * `NEXT_PUBLIC_SENTRY_DSN` (partagé client/serveur).
 *
 * @returns Le DSN non vide, ou `undefined` si aucun n'est fourni.
 */
export function resolveSentryDsn(env: EnvLike): string | undefined {
  if (!isBlank(env.SENTRY_DSN)) return env.SENTRY_DSN!.trim();
  if (!isBlank(env.NEXT_PUBLIC_SENTRY_DSN)) return env.NEXT_PUBLIC_SENTRY_DSN!.trim();
  return undefined;
}

/**
 * Sentry est activé **ssi** un DSN non vide est présent. Sans DSN → no-op total
 * (aucun `Sentry.init`, aucun événement).
 */
export function isSentryEnabled(env: EnvLike): boolean {
  return resolveSentryDsn(env) !== undefined;
}

/** Environnement Sentry : `SENTRY_ENVIRONMENT` sinon `NODE_ENV` sinon `"development"`. */
export function getSentryEnvironment(env: EnvLike): string {
  if (!isBlank(env.SENTRY_ENVIRONMENT)) return env.SENTRY_ENVIRONMENT!.trim();
  if (!isBlank(env.NODE_ENV)) return env.NODE_ENV!.trim();
  return "development";
}

/**
 * Taux d'échantillonnage des traces de performance. Défaut **prudent `0`** (monitoring
 * d'erreurs seulement, surface RGPD/volume minimale). Surcharge via
 * `SENTRY_TRACES_SAMPLE_RATE` ∈ [0, 1] ; toute valeur invalide retombe sur `0`.
 */
export function getTracesSampleRate(env: EnvLike): number {
  const raw = env.SENTRY_TRACES_SAMPLE_RATE;
  if (isBlank(raw)) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0;
  return parsed;
}

/**
 * Redacte les valeurs sensibles d'une query string (`?token=abc&x=1` → `?token=[REDACTED]&x=1`).
 * Tolérant : accepte la chaîne avec ou sans `?` initial ; renvoie l'entrée inchangée si non-string.
 */
export function redactQueryString(value: unknown): unknown {
  if (typeof value !== "string" || value === "") return value;
  const hasPrefix = value.startsWith("?");
  const body = hasPrefix ? value.slice(1) : value;
  const redacted = body
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      const key = pair.slice(0, eq);
      if (SENSITIVE_QUERY_KEYS.includes(key.toLowerCase())) return `${key}=[REDACTED]`;
      return pair;
    })
    .join("&");
  return hasPrefix ? `?${redacted}` : redacted;
}

/**
 * Expurge un événement Sentry de toute donnée potentiellement sensible **avant envoi**
 * (`beforeSend`). Fonction **pure** : ne mute pas l'entrée, renvoie une copie nettoyée.
 *
 * Retire : `event.user` (email/ip/username), `event.server_name`, `event.request.cookies`,
 * `event.request.data` (corps), les en-têtes d'auth, et redacte les tokens de `query_string`
 * et d'`url`. Défense en profondeur complétant `sendDefaultPii: false`.
 *
 * @param event Événement Sentry (forme tolérante).
 * @returns Événement expurgé (jamais `null` ici : on préfère envoyer un événement nettoyé
 *          plutôt que de le perdre, mais sans aucune donnée patient).
 */
export function scrubSentryEvent<T>(event: T): T {
  if (event === null || typeof event !== "object") return event;

  // Copie de surface + nettoyage ciblé (sans muter l'entrée). Générique pour rester
  // compatible avec les types stricts du SDK (`ErrorEvent`) tout en opérant sur la forme
  // minimale en interne.
  const source = event as unknown as MinimalSentryEvent;
  const scrubbed: MinimalSentryEvent = { ...source };
  delete scrubbed.user;
  delete scrubbed.server_name;

  if (scrubbed.request && typeof scrubbed.request === "object") {
    const request = { ...scrubbed.request };
    delete request.cookies;
    delete request.data;

    if (request.headers && typeof request.headers === "object") {
      const headers: Record<string, unknown> = { ...request.headers };
      for (const key of Object.keys(headers)) {
        if (SENSITIVE_HEADERS.includes(key.toLowerCase())) delete headers[key];
      }
      request.headers = headers;
    }

    if ("query_string" in request) request.query_string = redactQueryString(request.query_string);
    if (typeof request.url === "string" && request.url.includes("?")) {
      const [path, qs] = request.url.split(/\?(.+)/);
      request.url = `${path}?${redactQueryString(qs)}`;
    }

    scrubbed.request = request;
  }

  return scrubbed as unknown as T;
}

/**
 * Options de base communes aux init server/edge/client. Toujours RGPD-safe :
 * `sendDefaultPii: false` + `beforeSend = scrubSentryEvent`. Le SDK (passé en `init`)
 * complète avec `dsn`/intégrations.
 */
export function baseSentryOptions(env: EnvLike) {
  return {
    dsn: resolveSentryDsn(env),
    environment: getSentryEnvironment(env),
    tracesSampleRate: getTracesSampleRate(env),
    // Surface RGPD minimale : aucune PII par défaut, replay désactivé.
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Générique : conserve le type d'événement attendu par chaque init du SDK
    // (server/edge/client) tout en appliquant l'expurgation RGPD.
    beforeSend: scrubSentryEvent,
  };
}
