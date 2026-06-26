/**
 * Tests unitaires de la configuration d'observabilité Sentry (story 13.3).
 *
 * Test IDs: 13.3-UNIT-001..012
 * Level: Unit (aucune base, aucun réseau, aucun SDK — logique pure)
 */

import { describe, it, expect } from "vitest";

import {
  resolveSentryDsn,
  isSentryEnabled,
  getSentryEnvironment,
  getTracesSampleRate,
  redactQueryString,
  scrubSentryEvent,
  baseSentryOptions,
  type EnvLike,
  type MinimalSentryEvent,
} from "@/lib/observability/sentry";

describe("isSentryEnabled / resolveSentryDsn", () => {
  it("13.3-UNIT-001: désactivé quand aucun DSN n'est fourni", () => {
    expect(isSentryEnabled({})).toBe(false);
    expect(resolveSentryDsn({})).toBeUndefined();
  });

  it("13.3-UNIT-002: désactivé quand le DSN est vide ou ne contient que des espaces", () => {
    expect(isSentryEnabled({ NEXT_PUBLIC_SENTRY_DSN: "" })).toBe(false);
    expect(isSentryEnabled({ SENTRY_DSN: "   " })).toBe(false);
  });

  it("13.3-UNIT-003: activé avec NEXT_PUBLIC_SENTRY_DSN", () => {
    const env: EnvLike = { NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1" };
    expect(isSentryEnabled(env)).toBe(true);
    expect(resolveSentryDsn(env)).toBe("https://abc@o1.ingest.sentry.io/1");
  });

  it("13.3-UNIT-004: SENTRY_DSN (serveur) prioritaire sur NEXT_PUBLIC_SENTRY_DSN", () => {
    const env: EnvLike = { SENTRY_DSN: "https://server@s/1", NEXT_PUBLIC_SENTRY_DSN: "https://public@p/2" };
    expect(resolveSentryDsn(env)).toBe("https://server@s/1");
  });
});

describe("getSentryEnvironment", () => {
  it("13.3-UNIT-005: SENTRY_ENVIRONMENT prioritaire, sinon NODE_ENV, sinon development", () => {
    expect(getSentryEnvironment({ SENTRY_ENVIRONMENT: "production" })).toBe("production");
    expect(getSentryEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(getSentryEnvironment({})).toBe("development");
  });
});

describe("getTracesSampleRate", () => {
  it("13.3-UNIT-006: défaut 0 si absent ou invalide", () => {
    expect(getTracesSampleRate({})).toBe(0);
    expect(getTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "abc" })).toBe(0);
    expect(getTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "-0.5" })).toBe(0);
    expect(getTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "2" })).toBe(0);
  });

  it("13.3-UNIT-007: valeur valide ∈ [0,1] respectée", () => {
    expect(getTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "0.25" })).toBe(0.25);
    expect(getTracesSampleRate({ SENTRY_TRACES_SAMPLE_RATE: "1" })).toBe(1);
  });
});

describe("redactQueryString", () => {
  it("13.3-UNIT-008: redacte les tokens, préserve le reste et le préfixe ?", () => {
    expect(redactQueryString("?token=secret123&page=2")).toBe("?token=[REDACTED]&page=2");
    expect(redactQueryString("optOutToken=xyz&id=5")).toBe("optOutToken=[REDACTED]&id=5");
    expect(redactQueryString("page=2")).toBe("page=2");
  });

  it("13.3-UNIT-009: entrée non-string renvoyée inchangée", () => {
    expect(redactQueryString(undefined)).toBeUndefined();
    expect(redactQueryString(42)).toBe(42);
  });
});

describe("scrubSentryEvent — expurgation RGPD", () => {
  it("13.3-UNIT-010: retire user / cookies / corps / en-têtes sensibles, redacte url & query", () => {
    const event: MinimalSentryEvent = {
      message: "boom",
      user: { email: "patient@example.com", ip_address: "1.2.3.4", id: "u1" },
      server_name: "vercel-cdg1",
      request: {
        cookies: { booking_token: "jwt" },
        data: { firstName: "Jean", note: "antécédent cardiaque" },
        headers: { cookie: "a=b", authorization: "Bearer x", "user-agent": "UA" },
        query_string: "token=abc&x=1",
        url: "https://app/dashboard/patients/123?token=abc&tab=notes",
      },
    };

    const scrubbed = scrubSentryEvent(event)!;

    // Données patient supprimées.
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    // En-têtes : sensibles retirés, neutres conservés.
    expect(scrubbed.request?.headers).toEqual({ "user-agent": "UA" });
    // Tokens d'URL / query redactés.
    expect(scrubbed.request?.query_string).toBe("token=[REDACTED]&x=1");
    expect(scrubbed.request?.url).toBe("https://app/dashboard/patients/123?token=[REDACTED]&tab=notes");
    // Message technique conservé.
    expect(scrubbed.message).toBe("boom");
  });

  it("13.3-UNIT-011: pur — ne mute pas l'événement d'entrée", () => {
    const event: MinimalSentryEvent = { user: { email: "p@e.com" }, request: { cookies: { c: "1" } } };
    scrubSentryEvent(event);
    expect(event.user).toEqual({ email: "p@e.com" });
    expect(event.request?.cookies).toEqual({ c: "1" });
  });

  it("13.3-UNIT-012: null/événement minimal géré sans erreur", () => {
    expect(scrubSentryEvent(null)).toBeNull();
    expect(scrubSentryEvent({ message: "x" })).toEqual({ message: "x" });
  });
});

describe("baseSentryOptions", () => {
  it("13.3-UNIT-013: RGPD-safe par défaut (pas de PII, replay off, beforeSend branché)", () => {
    const opts = baseSentryOptions({ NEXT_PUBLIC_SENTRY_DSN: "https://k@h/1" });
    expect(opts.sendDefaultPii).toBe(false);
    expect(opts.replaysSessionSampleRate).toBe(0);
    expect(opts.replaysOnErrorSampleRate).toBe(0);
    expect(opts.dsn).toBe("https://k@h/1");
    // beforeSend applique le scrubbing.
    const out = opts.beforeSend({ user: { email: "p@e.com" }, message: "m" });
    expect(out?.user).toBeUndefined();
    expect(out?.message).toBe("m");
  });
});
