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

import { Calendar, Clock, Users } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Composant carte de statistique.
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
            <StatCard
              title="Rendez-vous aujourd'hui"
              value="8"
              description="3 confirmés, 5 en attente"
              icon={Calendar}
            />
            <StatCard
              title="Patients cette semaine"
              value="24"
              description="+12% par rapport à la semaine dernière"
              icon={Users}
            />
            <StatCard
              title="Prochain RDV"
              value="10:30"
              description="Jean Martin - Consultation"
              icon={Clock}
            />
          </div>

          {/* Sections principales */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Prochains rendez-vous */}
            <Card>
              <CardHeader>
                <CardTitle>Prochains rendez-vous</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: "10:30", patient: "Jean Martin", type: "Consultation" },
                    { time: "11:00", patient: "Marie Dupont", type: "Suivi" },
                    { time: "11:30", patient: "Pierre Bernard", type: "Première consultation" },
                    { time: "14:00", patient: "Sophie Leroy", type: "Contrôle" },
                  ].map((rdv, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb] font-medium">
                          {rdv.time}
                        </div>
                        <div>
                          <p className="font-medium">{rdv.patient}</p>
                          <p className="text-sm text-muted-foreground">
                            {rdv.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

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
