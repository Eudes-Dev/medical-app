/**
 * Page de gestion des patients
 *
 * Affiche une liste interactive de tous les patients avec:
 * - Table de données avec recherche et pagination
 * - Accès à la fiche détaillée de chaque patient
 * - Bouton pour créer un nouveau patient
 *
 * Route: /dashboard/patients
 *
 * @module app/dashboard/patients/page
 */

import { Plus } from "lucide-react";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PatientsTableWrapper } from "@/components/patients/patients-table-wrapper";

/**
 * Page principale de gestion des patients.
 *
 * Cette page affiche:
 * - Un header avec le titre "Gestion des Patients"
 * - Un bouton "Nouveau Patient" (pour la story 2.2)
 * - La table de données des patients (sera implémentée dans les tâches suivantes)
 *
 * @returns JSX de la page de gestion des patients
 */
export default function PatientsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header avec breadcrumb */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Patients</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Contenu principal */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header de la page avec titre et bouton */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Gestion des Patients
              </h1>
              <p className="text-muted-foreground">
                Gérez votre base de patients et accédez à leurs informations.
              </p>
            </div>
            {/* Bouton "Nouveau Patient" - sera utilisé dans la story 2.2 */}
            <Button asChild className="bg-[#2563eb] hover:bg-[#2563eb]/90">
              <Link href="/dashboard/patients/new">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Patient
              </Link>
            </Button>
          </div>

          {/* Carte principale contenant la table des patients */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des patients</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Wrapper client pour la table avec recherche et pagination */}
              <PatientsTableWrapper />
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
