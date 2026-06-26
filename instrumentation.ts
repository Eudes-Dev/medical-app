/**
 * Hook d'instrumentation Next.js (story 13.3).
 *
 * `register()` charge la config Sentry adaptée au runtime courant (Node.js ou edge).
 * `onRequestError` capture les erreurs de rendu serveur / route handlers (no-op si Sentry
 * désactivé, c.-à-d. sans DSN). Aucune donnée patient n'est transmise : l'expurgation est
 * appliquée en `beforeSend` (cf. `lib/observability/sentry`).
 *
 * @module instrumentation
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
