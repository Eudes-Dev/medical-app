/**
 * Page de gestion des congés et jours fériés (story 7.2).
 *
 * Server Component "shell" : charge les exceptions de l'année courante via
 * `getTimeOffs(currentYear)` (matérialisation idempotente des fériés) et passe
 * le tout au gestionnaire client `TimeOffManager`.
 *
 * Route: /dashboard/settings/timeoff
 *
 * @module app/dashboard/settings/timeoff/page
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
import { TimeOffManager } from "@/components/settings/timeoff-manager";
import { getTimeOffs } from "@/app/dashboard/settings/timeoff/actions";

export const metadata: Metadata = {
  title: "Congés & jours fériés — Paramètres",
  description:
    "Bloquez des journées entières ou des plages horaires (congés, formations, jours fériés) qui retirent automatiquement les créneaux du tunnel public.",
};

export default async function TimeOffPage() {
  const currentYear = new Date().getFullYear();
  const { manual, holidays } = await getTimeOffs(currentYear);

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
                <BreadcrumbPage>Congés &amp; jours fériés</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Congés &amp; jours fériés
            </h1>
            <p className="text-muted-foreground">
              Bloquez des journées entières (congés, formation) ou des plages
              spécifiques. Les créneaux concernés disparaissent du tunnel public.
            </p>
          </div>

          <TimeOffManager
            initialYear={currentYear}
            initialManual={manual}
            initialHolidays={holidays}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
