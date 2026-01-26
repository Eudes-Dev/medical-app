"use client";

/**
 * Composant formulaire de connexion
 *
 * Formulaire d'authentification avec validation Zod et react-hook-form.
 * Utilise les composants Shadcn UI et le composant InputGroup.
 *
 * @module components/auth/login-form
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputGroup } from "@/components/ui/input-group";

import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { signIn } from "@/lib/actions/auth";

/**
 * Formulaire de connexion praticien.
 *
 * Fonctionnalités:
 * - Validation côté client avec Zod + react-hook-form
 * - Affichage des erreurs de validation sous les champs
 * - Gestion des erreurs serveur (identifiants invalides)
 * - État de chargement pendant la soumission
 *
 * Design System:
 * - Bouton principal: Blue-600 (#2563eb)
 * - Erreurs: Rose-500
 *
 * @returns Le composant formulaire de connexion
 */
export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Gère la soumission du formulaire.
   * Appelle la Server Action signIn et gère les erreurs.
   */
  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    setIsLoading(true);

    try {
      const result = await signIn(data);

      if (result?.error) {
        setServerError(result.error);
      }
      // Si succès, la Server Action redirige vers /dashboard
    } catch {
      setServerError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Connexion</CardTitle>
        <CardDescription>
          Entrez vos identifiants pour accéder à votre espace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Message d'erreur serveur */}
          {serverError && (
            <div className="p-3 text-sm text-rose-500 bg-rose-50 border border-rose-200 rounded-md">
              {serverError}
            </div>
          )}

          {/* Champ Email */}
          <InputGroup
            label="Email"
            type="email"
            placeholder="praticien@exemple.com"
            autoComplete="email"
            disabled={isLoading}
            error={errors.email?.message}
            {...register("email")}
          />

          {/* Champ Mot de passe */}
          <InputGroup
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Bouton de soumission */}
          <Button
            type="submit"
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8]"
            disabled={isLoading}
          >
            {isLoading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
