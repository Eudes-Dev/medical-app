/**
 * Page d'accueil de l'application médicale.
 *
 * Cette page sert de point d'entrée et présente les deux espaces:
 * - Espace Public (/book): Prise de rendez-vous pour les patients
 * - Espace Privé (/dashboard): Tableau de bord pour le praticien
 *
 * Route: /
 *
 * @module app/page
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Page d'accueil principale.
 *
 * Présente une interface claire avec:
 * - Accès rapide à la réservation (patients)
 * - Accès au dashboard (praticien)
 * - Informations sur l'application
 *
 * @returns Le composant de page d'accueil
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-xl text-primary">Medical App</span>
          <nav className="flex items-center gap-4">
            <Link href="/book">
              <Button variant="ghost">Prendre rendez-vous</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Espace praticien</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Gestion de Cabinet Médical
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Une application moderne et intuitive pour gérer votre cabinet
            médical. Simplifiez la prise de rendez-vous et le suivi de vos
            patients.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/book">
              <Button size="lg" className="text-lg px-8">
                Prendre rendez-vous
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Accès praticien
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Carte Patients */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <CardTitle>Réservation en ligne</CardTitle>
              <CardDescription>
                Permettez à vos patients de prendre rendez-vous 24h/24, 7j/7
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Interface intuitive de réservation avec choix du type de
                consultation et du créneau horaire.
              </p>
            </CardContent>
          </Card>

          {/* Carte Calendrier */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <CardTitle>Gestion des patients</CardTitle>
              <CardDescription>
                Centralisez les informations de vos patients en un seul endroit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fiches patients complètes avec historique des consultations et
                notes médicales.
              </p>
            </CardContent>
          </Card>

          {/* Carte Dashboard */}
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <CardTitle>Tableau de bord</CardTitle>
              <CardDescription>
                Vue d&apos;ensemble de votre activité en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualisez vos rendez-vous, gérez votre planning et suivez vos
                statistiques.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Application single-tenant conçue pour les cabinets médicaux
            individuels.
            <br />
            Développée avec Next.js 16, TypeScript, TailwindCSS et Shadcn UI.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-slate-50">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          <p>© 2026 Medical App - Application de gestion de cabinet médical</p>
        </div>
      </footer>
    </div>
  );
}
