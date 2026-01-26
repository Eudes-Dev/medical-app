/**
 * Layout du Dashboard (Espace Praticien)
 *
 * Ce layout encapsule toutes les pages de l'espace privé /dashboard/*.
 * Il sera enrichi avec:
 * - Navigation latérale (sidebar)
 * - Protection d'authentification (Story 1.3)
 * - Header avec informations utilisateur
 *
 * Route: /dashboard/*
 *
 * @module app/dashboard/layout
 */

import type { ReactNode } from "react";

/**
 * Props du layout Dashboard.
 */
interface DashboardLayoutProps {
  /** Contenu de la page enfant */
  children: ReactNode;
}

/**
 * Layout wrapper pour l'espace praticien.
 *
 * Structure prévue:
 * ```
 * ┌─────────────────────────────────────┐
 * │           Header (navbar)           │
 * ├──────────┬──────────────────────────┤
 * │          │                          │
 * │  Sidebar │      Page Content        │
 * │  (nav)   │      (children)          │
 * │          │                          │
 * └──────────┴──────────────────────────┘
 * ```
 *
 * @param props - Props contenant les children
 * @returns Le layout du dashboard
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - À implémenter avec navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <span className="font-bold text-primary">Medical App</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {/* Navigation items à ajouter */}
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex">
        {/* Sidebar - À implémenter */}
        <aside className="hidden w-64 border-r bg-white md:block">
          <nav className="space-y-2 p-4">
            {/* Menu items à ajouter */}
            <p className="text-xs text-muted-foreground">
              Navigation à venir...
            </p>
          </nav>
        </aside>

        {/* Zone de contenu */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
