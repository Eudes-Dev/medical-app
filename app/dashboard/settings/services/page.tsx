/**
 * Page de gestion des types de soins (story 7.3).
 *
 * Server Component "shell" : charge le catalogue via `getServiceTypes()` et le
 * passe au gestionnaire client `ServiceTypeManager`.
 *
 * Route: /dashboard/settings/services
 *
 * @module app/dashboard/settings/services/page
 */

import type { Metadata } from "next";
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
import { ServiceTypeManager } from "@/components/settings/service-type-manager";
import { getServiceTypes } from "@/app/dashboard/settings/services/actions";

export const metadata: Metadata = {
  title: "Types de soins — Paramètres",
  description:
    "Configurez vos motifs de consultation : libellé, durée, couleur, tarif et visibilité dans le tunnel de réservation public.",
};

export default async function ServicesPage() {
  const services = await getServiceTypes();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                  <Link href="/dashboard/settings">Paramètres</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Types de soins</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Types de soins</h1>
            <p className="text-muted-foreground">
              Paramétrez la durée, le tarif et la couleur de chaque motif de
              consultation. Les soins publics sont proposés dans le tunnel de
              réservation.
            </p>
          </div>

          <ServiceTypeManager initialServices={services} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
