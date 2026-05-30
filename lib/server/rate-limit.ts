/**
 * Limiteur de débit par IP — fenêtre glissante en mémoire (story 5.3, SEC-001).
 *
 * Protège les Server Actions publiques (non authentifiées) du tunnel de
 * réservation contre les abus (énumération de créneaux, spam de réservations).
 *
 * ## Portée (MVP) et limites
 * - **En mémoire** (Map d'horodatages) : suffisant pour un déploiement
 *   **single-instance**. Sur un déploiement multi-instances (scaling horizontal
 *   Vercel/serverless), chaque instance a son propre compteur → la limite
 *   effective est multipliée par le nombre d'instances. Le compteur est aussi
 *   réinitialisé à chaque cold start.
 * - **Point d'extension** : pour un rate-limiting distribué et durable, brancher
 *   un backend partagé (ex. Upstash Redis / `@upstash/ratelimit`) derrière la
 *   même signature `checkRateLimit`. Hors périmètre MVP (cf. story 5.3).
 *
 * Aucune dépendance externe (contrainte MVP).
 *
 * @module lib/server/rate-limit
 */

import { headers } from "next/headers";

/** Horodatages (ms epoch) des requêtes récentes, par clé `action:ip`. */
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  /** `true` si la requête est autorisée (sous le seuil). */
  ok: boolean;
  /** Délai (ms) avant la prochaine requête autorisée, si bloquée. */
  retryAfterMs?: number;
}

/**
 * Vérifie et enregistre une requête pour `key` selon une fenêtre glissante.
 *
 * Algorithme : on conserve les horodatages des requêtes survenues dans la
 * fenêtre `[now - windowMs, now]`. Si leur nombre atteint `limit`, la requête
 * est refusée (sans être enregistrée) ; sinon elle est enregistrée et acceptée.
 *
 * @param key Identifiant logique (ex. `"slots:1.2.3.4"`).
 * @param limit Nombre maximal de requêtes autorisées dans la fenêtre.
 * @param windowMs Largeur de la fenêtre en millisecondes.
 * @param now Horodatage courant (injectable pour les tests).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    // Conserve la fenêtre élaguée ; ne pas enregistrer la requête refusée.
    buckets.set(key, recent);
    const retryAfterMs = recent[0] + windowMs - now;
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

/**
 * Extrait l'IP cliente **de confiance** des en-têtes de la requête courante
 * (Server Action / Route Handler).
 *
 * ## Anti-spoofing (SEC-002)
 * `x-forwarded-for` est une chaîne `client, proxy1, proxy2, …` où la partie
 * **gauche est contrôlée par le client** (falsifiable) : un attaquant qui fait
 * tourner cet en-tête contournerait le seau par-IP. On dérive donc l'IP d'une
 * **position de proxy de confiance** :
 *  1. `x-real-ip` — posé par la plateforme (Vercel) à l'IP réellement connectée,
 *     non falsifiable par le client → **source prioritaire**.
 *  2. à défaut, la valeur **la plus à droite** de `x-forwarded-for` (celle
 *     ajoutée par le proxy de confiance le plus proche), et non la plus à gauche.
 *     Hypothèse : 1 hop de proxy de confiance (Vercel). Pour davantage de hops,
 *     ajuster l'offset depuis la droite.
 *
 * Retourne `"unknown"` si aucune IP n'est disponible : toutes les requêtes sans
 * IP partagent alors le même seau (fail-safe — on limite plutôt que d'ouvrir).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  // 1. IP de confiance posée par la plateforme (non falsifiable).
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  // 2. Repli : valeur la plus à droite de x-forwarded-for (proxy de confiance).
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

/** Réinitialise tous les compteurs. **Tests uniquement.** */
export function __resetRateLimit(): void {
  buckets.clear();
}
