/**
 * Page de configuration des horaires d'ouverture (story 7.1).
 *
 * Server Component "shell" : charge le planning hebdomadaire via
 * `getWorkingHours()` (auth requise) et le passe à l'éditeur client.
 *
 * Route: /dashboard/settings/schedule
 *
 * @module app/dashboard/settings/schedule/page
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScheduleEditor } from "@/components/settings/schedule-editor";
import { getWorkingHours } from "@/app/dashboard/settings/schedule/actions";

export const metadata: Metadata = {
  title: "Horaires d'ouverture — Paramètres",
  description:
    "Définissez vos plages horaires par jour et la durée des créneaux proposés à la réservation en ligne.",
};

export default async function SchedulePage() {
  const schedule = await getWorkingHours();

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
                <BreadcrumbPage>Horaires d&apos;ouverture</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Horaires d&apos;ouverture
            </h1>
            <p className="text-muted-foreground">
              Définissez vos plages travaillées par jour. Les patients ne
              pourront réserver en ligne que sur ces plages.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Semaine type</CardTitle>
              <CardDescription>
                Ajoutez une ou plusieurs plages par jour, avec une durée de
                créneau (15 à 60 min). Une plage désactivée est conservée mais
                ne génère aucun créneau.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleEditor initialSchedule={schedule} />
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
