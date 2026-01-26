/**
 * Client Supabase pour le Middleware Next.js
 *
 * Ce module fournit un helper pour créer un client Supabase dans le middleware,
 * avec une gestion spécifique des cookies pour le rafraîchissement des tokens.
 *
 * @module lib/supabase/middleware
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Met à jour la session Supabase dans le middleware.
 *
 * Cette fonction:
 * 1. Crée un client Supabase avec accès aux cookies de la requête
 * 2. Vérifie et rafraîchit automatiquement les tokens expirés
 * 3. Propage les cookies mis à jour dans la réponse
 *
 * IMPORTANT: Utilise `getUser()` au lieu de `getSession()` pour une
 * validation sécurisée du token auprès du serveur Supabase Auth.
 *
 * @param request - Requête Next.js entrante
 * @returns Objet contenant le client Supabase, l'utilisateur et la réponse
 *
 * @example
 * ```typescript
 * // Dans middleware.ts
 * import { updateSession } from '@/lib/supabase/middleware'
 *
 * export async function middleware(request: NextRequest) {
 *   const { user, response } = await updateSession(request)
 *
 *   if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
 *     return NextResponse.redirect(new URL('/login', request.url))
 *   }
 *
 *   return response
 * }
 * ```
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Utiliser getUser() au lieu de getSession() pour la sécurité.
  // getSession() ne valide pas le JWT auprès du serveur Auth.
  // getUser() envoie une requête au serveur Supabase Auth pour valider le token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response: supabaseResponse };
}
