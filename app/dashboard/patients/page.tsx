/**
 * Page de gestion des patients (refonte UI « Espace Patients »).
 *
 * Affiche l'explorateur de patients :
 * - Cartes de statistiques animées
 * - Recherche, bascule vue table / cartes, création de patient
 * - Table / cartes premium avec pagination serveur
 *
 * Route: /dashboard/patients
 *
 * @module app/dashboard/patients/page
 */

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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { PatientsExplorer } from "@/components/patients/patients-explorer";

/**
 * Page principale de gestion des patients.
 *
 * @returns JSX de la page de gestion des patients
 */
export default function PatientsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#f6f8fb]">
        {/* Header avec breadcrumb (sticky + glassmorphism léger) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Tableau de bord</Link>
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
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          <PatientsExplorer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
