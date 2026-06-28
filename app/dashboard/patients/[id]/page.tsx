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
import { getConsultationNotes } from "@/app/dashboard/patients/consultation-note-actions";
import { getMedicalDocuments } from "@/app/dashboard/patients/medical-document-actions";
import { getMedicalHistoryEntries } from "@/app/dashboard/patients/medical-history-actions";
import { getConsentRecords } from "@/app/dashboard/patients/consent-actions";

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

  // Story 9.1 — historique des notes de consultation du patient.
  const consultationNotes = await getConsultationNotes(id);

  // Story 9.2 — documents médicaux du patient.
  const medicalDocuments = await getMedicalDocuments(id);

  // Story 9.3 — antécédents médicaux structurés du patient.
  const medicalHistoryEntries = await getMedicalHistoryEntries(id);

  // Story 11.1 — consentements RGPD par finalité du patient.
  const consentRecords = await getConsentRecords(id);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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

        {/* Contenu principal: fiche patient (héro + onglets) */}
        <main className="flex flex-1 flex-col gap-4 bg-[#f6f8fb] p-4 md:p-6 lg:p-8">
          <PatientDetailClient
            patient={patient}
            medicalHistoryEntries={medicalHistoryEntries}
            consultationNotes={consultationNotes}
            medicalDocuments={medicalDocuments}
            consentRecords={consentRecords}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

