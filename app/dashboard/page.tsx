/**
 * Page d'accueil du Dashboard (Espace Praticien)
 *
 * Cette page est le point d'entrée de l'espace privé du praticien.
 * Elle sera protégée par authentification (Story 1.3).
 *
 * Route: /dashboard
 *
 * @module app/dashboard/page
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Page principale du tableau de bord praticien.
 *
 * Fonctionnalités prévues:
 * - Vue d'ensemble des rendez-vous du jour
 * - Accès rapide aux patients récents
 * - Statistiques du cabinet
 *
 * @returns Le composant de page du dashboard
 */
export default function DashboardPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">
        Tableau de bord
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Carte des rendez-vous du jour */}
        <Card>
          <CardHeader>
            <CardTitle>Rendez-vous du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Les rendez-vous seront affichés ici après configuration de la base
              de données (Story 1.2).
            </p>
          </CardContent>
        </Card>

        {/* Carte des patients récents */}
        <Card>
          <CardHeader>
            <CardTitle>Patients récents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              La liste des patients sera disponible après Story 2.1.
            </p>
          </CardContent>
        </Card>

        {/* Carte des actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Les actions seront disponibles prochainement.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
