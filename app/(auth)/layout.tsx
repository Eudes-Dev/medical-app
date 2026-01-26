/**
 * Layout des pages d'authentification
 *
 * Ce layout encapsule les pages /login, /signup, etc.
 * Il fournit un conteneur centré pour les formulaires d'authentification.
 *
 * Route group: (auth)
 *
 * @module app/(auth)/layout
 */

import type { ReactNode } from "react";

/**
 * Props du layout Auth.
 */
interface AuthLayoutProps {
  /** Contenu de la page enfant */
  children: ReactNode;
}

/**
 * Layout wrapper pour les pages d'authentification.
 *
 * Structure:
 * - Centrage vertical et horizontal
 * - Fond légèrement coloré (slate-50)
 * - Conteneur responsive avec padding
 *
 * @param props - Props contenant les children
 * @returns Le layout d'authentification
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Medical App</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Espace praticien
          </p>
        </div>

        {/* Contenu (formulaire) */}
        {children}
      </div>
    </div>
  );
}
