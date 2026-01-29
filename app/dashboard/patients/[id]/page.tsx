/**
 * Page de fiche patient.
 *
 * Route: /dashboard/patients/[id]
 *
 * Cette page:
 * - Récupère les détails d'un patient via `getPatientById`
 * - Affiche les informations principales du patient
 * - Affiche l'historique des rendez-vous
 * - Intègre le mode édition via le composant client `PatientDetailClient`
 */

import { notFound } from "next/navigation";
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
import { PatientDetailClient } from "@/components/patients/patient-detail";
import { getPatientById } from "@/app/dashboard/patients/actions";

type PatientDetailPageProps = {
  /**
   * Avec Next.js 16, `params` est désormais un Promise.
   * On le typait donc explicitement comme tel pour pouvoir l'`await`.
   */
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientDetailPage(
  props: PatientDetailPageProps
) {
  // Déstructuration de `params` après résolution du Promise
  const { id } = await props.params;
  const patient = await getPatientById(id);

  if (!patient) {
    notFound();
  }

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
                <BreadcrumbLink asChild>
                  <Link href="/dashboard/patients">Patients</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {patient.firstName} {patient.lastName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Contenu principal: fiche patient */}
        <main className="flex flex-1 flex-col gap-4 p-4">
          <PatientDetailClient patient={patient} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

