/**
 * Page de Réservation Publique
 *
 * Cette page est le point d'entrée du tunnel de réservation pour les patients.
 * Elle est accessible SANS authentification.
 *
 * Route: /book
 *
 * Flux utilisateur prévu (Story 4.1 et 4.2):
 * 1. Sélection du type de consultation
 * 2. Choix de la date et du créneau
 * 3. Saisie des informations patient
 * 4. Confirmation de la réservation
 *
 * @module app/book/page
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Page d'accueil du tunnel de réservation.
 *
 * Design UX:
 * - Interface épurée et rassurante
 * - Étapes clairement identifiées
 * - Accessibilité prioritaire
 *
 * @returns Le composant de page de réservation
 */
export default function BookingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Prendre rendez-vous
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Réservez votre consultation en quelques clics. Choisissez le
            créneau qui vous convient le mieux.
          </p>
        </div>

        {/* Carte de sélection de consultation */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Type de consultation</CardTitle>
              <CardDescription>
                Sélectionnez le type de rendez-vous souhaité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Placeholder pour les types de consultation */}
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start text-left"
                  disabled
                >
                  <div>
                    <div className="font-semibold">Consultation générale</div>
                    <div className="text-sm text-muted-foreground">
                      30 minutes - Bilan de santé, suivi régulier
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 justify-start text-left"
                  disabled
                >
                  <div>
                    <div className="font-semibold">Première consultation</div>
                    <div className="text-sm text-muted-foreground">
                      45 minutes - Nouveau patient
                    </div>
                  </div>
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-4">
                Le système de réservation sera disponible après les Stories 4.1
                et 4.2.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informations de contact */}
        <div className="text-center mt-12 text-slate-600">
          <p>
            Besoin d&apos;aide ? Contactez-nous au{" "}
            <span className="font-semibold">01 23 45 67 89</span>
          </p>
        </div>
      </div>
    </main>
  );
}
