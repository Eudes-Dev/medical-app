/**
 * Middleware Next.js pour la protection des routes
 *
 * Ce middleware intercepte toutes les requêtes vers /dashboard/*
 * et vérifie que l'utilisateur est authentifié via Supabase Auth.
 *
 * @module middleware
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware de protection des routes.
 *
 * Comportement:
 * 1. Rafraîchit la session Supabase (tokens expirés)
 * 2. Vérifie si l'utilisateur est authentifié via getUser()
 * 3. Redirige vers /login si non authentifié
 * 4. Laisse passer la requête si authentifié
 *
 * IMPORTANT: Utilise getUser() au lieu de getSession() pour une
 * validation sécurisée du token auprès du serveur Supabase Auth.
 *
 * @param request - Requête Next.js entrante
 * @returns NextResponse (redirection ou continuation)
 */
export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request);

  // Si l'utilisateur n'est pas authentifié et tente d'accéder au dashboard
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    // Rediriger vers la page de connexion
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Optionnel: Rediriger les utilisateurs connectés qui accèdent à /login vers /dashboard
  if (user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

/**
 * Configuration du matcher.
 *
 * Le middleware s'exécute sur:
 * - Toutes les routes /dashboard et sous-routes
 * - La route /login (pour la redirection des utilisateurs connectés)
 *
 * Exclut automatiquement:
 * - Les fichiers statiques (_next/static)
 * - Les images optimisées (_next/image)
 * - Le favicon
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
  ],
};
