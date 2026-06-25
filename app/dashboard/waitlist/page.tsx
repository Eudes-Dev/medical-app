/**
 * Page Liste d'attente (story 8.5).
 *
 * Server Component : charge la file priorisée (`getWaitlist`, triée URGENT > HIGH
 * > NORMAL puis FIFO) et la rend dans le même shell que les autres onglets
 * dashboard (sidebar + header/breadcrumb). Les interactions (ajout, retrait,
 * conversion en RDV) sont déléguées au composant client `WaitlistView`.
 *
 * Remplace l'ancien `PlaceholderPage`.
 *
 * @module app/dashboard/waitlist/page
 */

import Link from "next/link";
import { Clock } from "lucide-react";

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
import { WaitlistView } from "@/components/waitlist/WaitlistView";
import { getWaitlist } from "@/app/dashboard/waitlist/actions";

export default async function WaitlistPage() {
  const entries = await getWaitlist();

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
                <BreadcrumbPage>Liste d'attente</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg">
              <Clock className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Liste d'attente
              </h1>
              <p className="text-muted-foreground">
                Patients en attente d'un créneau, priorisés par urgence. Quand un
                rendez-vous se libère, programmez-le en un clic.
              </p>
            </div>
          </div>

          <WaitlistView entries={entries} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
