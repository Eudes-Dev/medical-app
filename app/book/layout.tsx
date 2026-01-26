/**
 * Layout du Tunnel de Réservation (Espace Public)
 *
 * Ce layout encapsule toutes les pages du tunnel de réservation /book/*.
 * Il ne requiert PAS d'authentification.
 *
 * Caractéristiques:
 * - Design épuré et accessible
 * - Pas de navigation complexe
 * - Focus sur le flux de réservation
 *
 * Route: /book/*
 *
 * @module app/book/layout
 */

import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Props du layout Book.
 */
interface BookLayoutProps {
  /** Contenu de la page enfant */
  children: ReactNode;
}

/**
 * Layout wrapper pour le tunnel de réservation public.
 *
 * Structure:
 * ```
 * ┌─────────────────────────────────────┐
 * │         Header minimal             │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │         Page Content                │
 * │         (réservation)               │
 * │                                     │
 * ├─────────────────────────────────────┤
 * │         Footer (contact)            │
 * └─────────────────────────────────────┘
 * ```
 *
 * @param props - Props contenant les children
 * @returns Le layout du tunnel de réservation
 */
export default function BookLayout({ children }: BookLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header minimal */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-primary">
            Medical App
          </Link>
          <span className="text-sm text-muted-foreground">
            Prise de rendez-vous en ligne
          </span>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>© 2026 Medical App - Tous droits réservés</p>
          <p className="mt-2">
            Application de gestion de cabinet médical single-tenant
          </p>
        </div>
      </footer>
    </div>
  );
}
