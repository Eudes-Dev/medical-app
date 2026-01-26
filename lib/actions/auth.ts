"use server";

/**
 * Server Actions pour l'authentification
 *
 * Ce module contient les Server Actions pour l'authentification
 * des praticiens via Supabase Auth (connexion et déconnexion).
 *
 * @module lib/actions/auth
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

/**
 * Type de retour de la Server Action signIn.
 */
type SignInResult = {
  error?: string;
} | void;

/**
 * Connecte un praticien avec email et mot de passe.
 *
 * Cette Server Action:
 * 1. Valide les données avec Zod (double vérification serveur)
 * 2. Appelle Supabase Auth signInWithPassword
 * 3. Redirige vers /dashboard en cas de succès
 * 4. Retourne une erreur formatée en cas d'échec
 *
 * @param data - Données du formulaire (email, password)
 * @returns Erreur formatée ou void (redirection)
 */
export async function signIn(data: LoginFormData): Promise<SignInResult> {
  // Validation côté serveur (double vérification)
  const validatedData = loginSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: "Données invalides. Veuillez vérifier vos informations.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validatedData.data.email,
    password: validatedData.data.password,
  });

  if (error) {
    // Mapper les erreurs Supabase vers des messages utilisateur
    if (error.message === "Invalid login credentials") {
      return {
        error: "Email ou mot de passe incorrect.",
      };
    }

    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Veuillez confirmer votre email avant de vous connecter.",
      };
    }

    // Erreur générique pour les autres cas
    return {
      error: "Une erreur est survenue lors de la connexion. Veuillez réessayer.",
    };
  }

  // Connexion réussie - redirection vers le dashboard
  redirect("/dashboard");
}

/**
 * Déconnecte le praticien actuellement connecté.
 *
 * Cette Server Action:
 * 1. Appelle Supabase Auth signOut pour invalider la session
 * 2. Redirige vers la page de connexion
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // Toujours rediriger vers login après déconnexion
  redirect("/login");
}
