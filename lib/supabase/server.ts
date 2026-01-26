/**
 * Client Supabase côté serveur (Server Client)
 *
 * Ce client est utilisé dans les Server Components et Server Actions
 * pour les opérations nécessitant un accès serveur sécurisé.
 *
 * @module lib/supabase/server
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crée un client Supabase pour le serveur (Server Components & Server Actions).
 *
 * Gère automatiquement les cookies Next.js pour maintenir la session utilisateur.
 * Le client rafraîchit les tokens expirés automatiquement.
 *
 * @returns Promise d'une instance du client Supabase Server
 *
 * @example
 * ```typescript
 * // Dans un Server Component ou Server Action
 * import { createClient } from '@/lib/supabase/server'
 *
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // La méthode `setAll` a été appelée depuis un Server Component.
            // Cela peut être ignoré si on a un middleware qui rafraîchit
            // les sessions utilisateur.
          }
        },
      },
    }
  );
}
