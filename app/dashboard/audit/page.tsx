/**
 * Page « Journal d'audit » RGPD (story 11.3).
 *
 * Route: /dashboard/audit
 *
 * Surface **lecture seule** de la piste d'audit append-only : liste les
 * opérations sensibles tracées (export art. 20, effacement art. 17, changements
 * de consentement 11.1), de la plus récente à la plus ancienne. Les patients
 * effacés restent identifiables via le snapshot `patientLabel`.
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAuditLogEntries } from "@/app/dashboard/audit/actions";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_DANGER_ACTIONS,
  AUDIT_LABELS,
} from "@/lib/rgpd/audit";

// Page authentifiée : lecture du journal via `requireUser()` (cookies) → rendu
// dynamique obligatoire (même pattern que app/dashboard/page.tsx).
export const dynamic = "force-dynamic";

/** Formatage FR date + heure d'un événement d'audit. */
function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditLogPage() {
  const entries = await getAuditLogEntries();

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
                <BreadcrumbPage>{AUDIT_LABELS.pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 items-center">
          <div className="w-full max-w-5xl">
            <Card>
              <CardHeader>
                <CardTitle>{AUDIT_LABELS.pageTitle}</CardTitle>
                <CardDescription>{AUDIT_LABELS.intro}</CardDescription>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {AUDIT_LABELS.empty}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {entries.map((entry) => {
                      const isDanger = AUDIT_DANGER_ACTIONS.has(entry.action);
                      return (
                        <li
                          key={entry.id}
                          className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isDanger ? "destructive" : "secondary"}
                              >
                                {AUDIT_ACTION_LABELS[entry.action]}
                              </Badge>
                              <span className="text-sm font-medium">
                                {entry.patientLabel ??
                                  AUDIT_LABELS.unknownPatient}
                              </span>
                            </div>
                            {entry.summary && (
                              <span className="text-sm text-muted-foreground">
                                {entry.summary}
                              </span>
                            )}
                            {entry.actorEmail && (
                              <span className="text-xs text-muted-foreground">
                                {AUDIT_LABELS.columns.actor} :{" "}
                                {entry.actorEmail}
                              </span>
                            )}
                          </div>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.createdAt)}
                          </time>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
