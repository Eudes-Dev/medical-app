/**
 * Initialisation Sentry — runtime serveur Node.js (story 13.3).
 *
 * Chargé par `instrumentation.ts` quand `NEXT_RUNTIME === "nodejs"`. L'init n'a lieu que si
 * un DSN est fourni (no-op total sinon). Options RGPD-safe centralisées dans
 * `lib/observability/sentry` (`sendDefaultPii: false`, `beforeSend = scrubSentryEvent`).
 */
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions, isSentryEnabled } from "@/lib/observability/sentry";

if (isSentryEnabled(process.env)) {
  Sentry.init(baseSentryOptions(process.env));
}
