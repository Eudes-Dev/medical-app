/**
 * Page d'accueil du Dashboard
 *
 * Vue d'ensemble de l'activité du cabinet:
 * - Statistiques du jour (RDV, patients)
 * - Prochains rendez-vous
 * - Activité récente
 *
 * Route: /dashboard
 *
 * @module app/dashboard/page
 */

import { Users } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  TodayAppointmentsCard,
  UpcomingAppointmentsCard,
} from "@/components/dashboard/dashboard-stats";

/**
 * Composant carte de statistique.
 * 
 * Affiche une carte avec une icône, un titre, une valeur et une description.
 * Utilisé pour les statistiques générales du dashboard.
 */
function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Page principale du dashboard.
 */
export default function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2  px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Titre de la page */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Bonjour, Dr. Eudes
            </h1>
            <p className="text-muted-foreground">
              Voici un aperçu de votre journée.
            </p>
          </div>

          {/* Cartes de statistiques */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Carte: Nombre de RDV aujourd'hui - récupérée depuis la base de données */}
            <TodayAppointmentsCard />
            
            {/* Statistique: Patients cette semaine */}
            {/* TODO: Implémenter dans une story future avec vraies données */}
            <StatCard
              title="Patients cette semaine"
              value="24"
              description="+12% par rapport à la semaine dernière"
              icon={Users}
            />
          </div>

          {/* Sections principales */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Carte: Prochains rendez-vous - récupérée depuis la base de données */}
            <UpcomingAppointmentsCard />

            {/* Activité récente */}
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: "Nouveau patient ajouté", detail: "Sophie Leroy", time: "Il y a 2h" },
                    { action: "RDV confirmé", detail: "Jean Martin - 10:30", time: "Il y a 3h" },
                    { action: "Note ajoutée", detail: "Dossier Marie Dupont", time: "Hier" },
                    { action: "RDV annulé", detail: "Paul Moreau", time: "Hier" },
                  ].map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.detail}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
