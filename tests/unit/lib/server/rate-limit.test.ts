// @vitest-environment node
/**
 * Tests unitaires du limiteur de débit en mémoire (story 5.3, SEC-001).
 *
 * Couvre : autorisation sous le seuil, blocage au-delà, isolation par clé,
 * réinitialisation après la fenêtre, et extraction de l'IP cliente.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, __resetRateLimit } from "@/lib/server/rate-limit";

describe("checkRateLimit — fenêtre glissante", () => {
  beforeEach(() => __resetRateLimit());

  it("autorise les requêtes sous le seuil", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, 60_000, t0 + i).ok).toBe(true);
    }
  });

  it("bloque la requête qui atteint le seuil", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("k", 3, 60_000, t0 + i).ok).toBe(true);
    }
    const blocked = checkRateLimit("k", 3, 60_000, t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("ne décompte pas la requête refusée (pas de pénalité cumulative)", () => {
    const t0 = 1_000_000;
    checkRateLimit("k", 1, 60_000, t0); // OK (1ère)
    expect(checkRateLimit("k", 1, 60_000, t0 + 1).ok).toBe(false); // refusée
    expect(checkRateLimit("k", 1, 60_000, t0 + 2).ok).toBe(false); // toujours refusée
    // Après la fenêtre, on repart à zéro.
    expect(checkRateLimit("k", 1, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("réautorise après expiration de la fenêtre", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit("k", 1, 1_000, t0).ok).toBe(true);
    expect(checkRateLimit("k", 1, 1_000, t0 + 500).ok).toBe(false);
    // 1 001 ms plus tard : la 1ère requête est sortie de la fenêtre.
    expect(checkRateLimit("k", 1, 1_000, t0 + 1_001).ok).toBe(true);
  });

  it("isole les compteurs par clé (IP différentes)", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit("slots:1.1.1.1", 1, 60_000, t0).ok).toBe(true);
    expect(checkRateLimit("slots:1.1.1.1", 1, 60_000, t0 + 1).ok).toBe(false);
    // Autre IP → compteur indépendant.
    expect(checkRateLimit("slots:2.2.2.2", 1, 60_000, t0 + 1).ok).toBe(true);
  });
});

describe("getClientIp — extraction de l'IP", () => {
  beforeEach(() => {
    // Purge le registre de modules pour que `vi.doMock("next/headers")`
    // s'applique au ré-import de `rate-limit` (l'import statique du haut a déjà
    // chargé la vraie implémentation).
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("priorise x-real-ip (de confiance) même si x-forwarded-for est présent", async () => {
    // x-forwarded-for gauche est falsifiable ⇒ x-real-ip (plateforme) l'emporte.
    vi.doMock("next/headers", () => ({
      headers: async () =>
        new Headers({
          "x-forwarded-for": "1.2.3.4, 203.0.113.7",
          "x-real-ip": "198.51.100.2",
        }),
    }));
    const { getClientIp } = await import("@/lib/server/rate-limit");
    expect(await getClientIp()).toBe("198.51.100.2");
  });

  it("sans x-real-ip, retient la valeur la plus à DROITE de x-forwarded-for (anti-spoof SEC-002)", async () => {
    // La gauche ("1.2.3.4") est contrôlée par le client ; on retient la droite
    // ("70.41.3.18"), ajoutée par le proxy de confiance le plus proche.
    vi.doMock("next/headers", () => ({
      headers: async () =>
        new Headers({ "x-forwarded-for": "1.2.3.4, 70.41.3.18" }),
    }));
    const { getClientIp } = await import("@/lib/server/rate-limit");
    expect(await getClientIp()).toBe("70.41.3.18");
  });

  it("retombe sur 'unknown' sans en-tête d'IP", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    const { getClientIp } = await import("@/lib/server/rate-limit");
    expect(await getClientIp()).toBe("unknown");
  });
});
