"use client";

/**
 * Composant bouton de déconnexion
 *
 * Bouton qui déclenche la déconnexion de l'utilisateur
 * via la Server Action signOut.
 *
 * @module components/auth/logout-button
 */

import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

/**
 * Props du composant LogoutButton.
 */
interface LogoutButtonProps {
  /** Variante d'affichage du bouton */
  variant?: "default" | "ghost" | "outline";
  /** Afficher uniquement l'icône (sans texte) */
  iconOnly?: boolean;
}

/**
 * Bouton de déconnexion.
 *
 * Fonctionnalités:
 * - Appelle la Server Action signOut au clic
 * - Affiche un état de chargement pendant la déconnexion
 * - Supporte différentes variantes d'affichage
 *
 * @param props - Props du composant
 * @returns Le composant bouton de déconnexion
 *
 * @example
 * ```tsx
 * // Bouton complet
 * <LogoutButton />
 *
 * // Icône seule (pour header compact)
 * <LogoutButton iconOnly variant="ghost" />
 * ```
 */
export function LogoutButton({
  variant = "ghost",
  iconOnly = false,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await signOut();
    } catch {
      // En cas d'erreur, on reste sur la page
      // L'utilisateur peut réessayer
      setIsLoading(false);
    }
  }

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleSignOut}
        disabled={isLoading}
        title="Se déconnecter"
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Se déconnecter</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      disabled={isLoading}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Déconnexion..." : "Se déconnecter"}
    </Button>
  );
}
