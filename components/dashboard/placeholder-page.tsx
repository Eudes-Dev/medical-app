/**
 * Layout placeholder pour les onglets du dashboard en cours d'implémentation.
 *
 * Fournit un shell cohérent (sidebar + header + breadcrumb) et un encart
 * "Bientôt disponible" listant les fonctionnalités prévues par les stories
 * de la roadmap.
 *
 * @module components/dashboard/placeholder-page
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export interface PlannedFeature {
  title: string;
  description?: string;
  storyId?: string;
}

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: PlannedFeature[];
  mvp?: boolean;
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  features,
  mvp = false,
}: PlaceholderPageProps) {
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
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg">
                <Icon className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-muted-foreground">{description}</p>
              </div>
            </div>
            <Badge variant={mvp ? "default" : "secondary"}>
              {mvp ? "MVP" : "Roadmap"}
            </Badge>
          </div>

          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Construction className="text-muted-foreground size-5" />
                <CardTitle className="text-base">
                  Module en cours d'implémentation
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                Les fonctionnalités ci-dessous sont planifiées dans le backlog
                et seront livrées progressivement.
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {features.map((feature) => (
                  <li
                    key={feature.title}
                    className="bg-muted/40 flex flex-col gap-1 rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {feature.title}
                      </span>
                      {feature.storyId && (
                        <Badge variant="outline" className="text-xs">
                          {feature.storyId}
                        </Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-muted-foreground text-xs">
                        {feature.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
