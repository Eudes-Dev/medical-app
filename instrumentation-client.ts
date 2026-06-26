/**
 * Initialisation Sentry — runtime navigateur (story 13.3).
 *
 * `instrumentation-client.ts` est exécuté côté client par Next.js. Init gated sur DSN
 * (`NEXT_PUBLIC_SENTRY_DSN`) ; options RGPD-safe partagées. Aucune capture PII, replay
 * désactivé par défaut (`lib/observability/sentry`).
 */
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions, isSentryEnabled } from "@/lib/observability/sentry";

if (isSentryEnabled(process.env)) {
  Sentry.init(baseSentryOptions(process.env));
}

// Capture des transitions de navigation App Router (no-op si Sentry désactivé).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
