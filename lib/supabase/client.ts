/**
 * Client Supabase côté navigateur (Browser Client)
 *
 * Ce client est utilisé dans les composants React côté client
 * pour les opérations d'authentification et les requêtes temps réel.
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * Crée un client Supabase pour le navigateur.
 *
 * Utilise les variables d'environnement publiques NEXT_PUBLIC_*.
 * Ce client gère automatiquement les cookies de session.
 *
 * @returns Instance du client Supabase Browser
 *
 * @example
 * ```typescript
 * // Dans un composant client
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * const supabase = createClient()
 * const { data, error } = await supabase.auth.signInWithPassword({...})
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
