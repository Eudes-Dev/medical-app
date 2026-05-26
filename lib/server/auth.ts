/**
 * Helpers d'authentification serveur (Story 5.2).
 *
 * Centralise la garde d'auth pour toutes les Server Actions du dashboard,
 * en remplacement du pattern dupliqué `createClient() → getUser() → throw`.
 *
 * Sécurité : ces helpers s'appuient sur `supabase.auth.getUser()` qui valide
 * le token côté serveur Supabase, et non `getSession()` qui se contente de
 * lire le cookie local (non vérifié).
 *
 * @module lib/server/auth
 */

import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError } from "@/lib/errors";

/** Utilisateur applicatif minimal renvoyé par les helpers d'auth. */
export type AuthUser = {
  id: string;
  email?: string;
};

/**
 * Récupère l'utilisateur authentifié ou lève `UnauthorizedError`.
 *
 * À utiliser en tête de chaque Server Action du dashboard. Le middleware
 * (`middleware.ts`) reste la 1ʳᵉ ligne de défense en redirigeant vers `/login`;
 * ce helper est la 2ᵉ ligne (défense en profondeur).
 *
 * @throws {UnauthorizedError} Si aucun utilisateur n'est authentifié.
 *
 * @example
 * ```typescript
 * export async function getPatients() {
 *   const user = await requireUser();
 *   // ... requêtes Prisma ...
 * }
 * ```
 */
export async function requireUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new UnauthorizedError("User must be authenticated");
  }
  return { id: user.id, email: user.email };
}

/**
 * Variante non bloquante : retourne l'utilisateur ou `null`.
 *
 * Utile pour les pages publiques qui adaptent leur affichage selon
 * l'état de connexion (sans rediriger).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email };
}
