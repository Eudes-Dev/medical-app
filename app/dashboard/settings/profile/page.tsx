/**
 * Page de configuration du profil public du cabinet (story 7.4).
 *
 * Server Component "shell" : charge le profil via `getCabinetProfile()` (auth
 * requise) et le passe au formulaire client.
 *
 * Route: /dashboard/settings/profile
 *
 * @module app/dashboard/settings/profile/page
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
import { CabinetProfileForm } from "@/components/settings/cabinet-profile-form";
import { getCabinetProfile } from "@/app/dashboard/settings/profile/actions";

export const metadata: Metadata = {
  title: "Profil cabinet public — Paramètres",
  description:
    "Configurez les informations publiques de votre cabinet (nom, présentation, adresse, contact) affichées sur votre page d'accueil.",
};

export default async function ProfilePage() {
  const profile = await getCabinetProfile();

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
                <BreadcrumbPage>Profil cabinet public</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Profil cabinet public
            </h1>
            <p className="text-muted-foreground">
              Ces informations sont affichées sur votre page d&apos;accueil
              publique et dans les e-mails envoyés à vos patients.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations du cabinet</CardTitle>
              <CardDescription>
                Le libellé des horaires affiché publiquement est dérivé
                automatiquement de vos horaires d&apos;ouverture.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CabinetProfileForm initialProfile={profile} />
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
