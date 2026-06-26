/**
 * Initialisation Sentry — runtime edge (middleware / edge routes) (story 13.3).
 *
 * Chargé par `instrumentation.ts` quand `NEXT_RUNTIME === "edge"`. Init gated sur DSN ;
 * options RGPD-safe partagées (`lib/observability/sentry`).
 */
import * as Sentry from "@sentry/nextjs";

import { baseSentryOptions, isSentryEnabled } from "@/lib/observability/sentry";

if (isSentryEnabled(process.env)) {
  Sentry.init(baseSentryOptions(process.env));
}
