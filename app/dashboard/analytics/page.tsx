/**
 * Page « Statistiques » du cabinet (story 10.1).
 *
 * Route: /dashboard/analytics
 *
 * Tableau de bord analytique agrégé sur une **période sélectionnable**
 * (7j / 30j / 90j / 12 mois) : chiffre d'affaires, fréquentation (nombre de RDV
 * + répartition par statut), nouveaux patients, taux d'annulation / no-show, et
 * répartition par type de soin. Chaque indicateur est comparé à la **période
 * précédente** équivalente. Lecture seule (aucune écriture en base).
 *
 * Remplace l'ancien `PlaceholderPage` (features annoncées sous l'ID 10.1).
 */

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck2,
  Euro,
  Minus,
  UserPlus2,
  XCircle,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import { AnalyticsPeriodSelector } from "@/components/dashboard/analytics-period-selector";
import { getCabinetStatistics } from "@/app/dashboard/analytics/analytics-data";
import {
  parseStatsPeriod,
  STATS_PERIODS,
  type CabinetStatistics,
} from "@/lib/analytics/stats";

// Page authentifiée (lecture via cookies/`requireUser`) → rendu dynamique
// obligatoire, même pattern que app/dashboard/audit/page.tsx.
export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const STATUS_LABELS: Record<keyof CabinetStatistics["appointments"]["byStatus"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmés",
  COMPLETED: "Terminés",
  CANCELLED: "Annulés",
};

const TOP_SERVICE_TYPES = 5;

function formatDateRange(range: CabinetStatistics["range"]): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  };
  const start = new Date(range.start).toLocaleDateString("fr-FR", opts);
  const end = new Date(range.end).toLocaleDateString("fr-FR", opts);
  return `${start} → ${end}`;
}

/** Pastille de tendance : positif = hausse (vert), négatif = baisse (rouge).
 *  `invert` inverse la sémantique de couleur (utile pour le taux d'annulation,
 *  où une hausse est défavorable). */
function TrendBadge({
  value,
  suffix,
  invert = false,
}: {
  value: number;
  suffix: string;
  invert?: boolean;
}) {
  const isUp = value > 0;
  const isDown = value < 0;
  const good = invert ? isDown : isUp;
  const bad = invert ? isUp : isDown;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const sign = value > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good && "text-emerald-600 dark:text-emerald-400",
        bad && "text-red-600 dark:text-red-400",
        !good && !bad && "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {sign}
      {value}
      {suffix}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  helpText,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: React.ReactNode;
  helpText: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {trend}
          <span className="text-xs text-muted-foreground">{helpText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseStatsPeriod(periodParam);
  const stats = await getCabinetStatistics(period);

  const periodLabel =
    STATS_PERIODS.find((p) => p.value === period)?.label ?? "";
  const topServices = stats.byServiceType.slice(0, TOP_SERVICE_TYPES);

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
                <BreadcrumbPage>Statistiques</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 items-center">
          <div className="flex w-full max-w-6xl flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold leading-none">
                    Statistiques du cabinet
                  </h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateRange(stats.range)} · {periodLabel}
                  </p>
                </div>
              </div>
              <AnalyticsPeriodSelector current={period} />
            </div>

            {/* KPI principaux */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Chiffre d'affaires"
                value={currencyFormatter.format(stats.revenue.value)}
                icon={<Euro className="size-4" />}
                trend={
                  <TrendBadge
                    value={stats.revenue.trendPercent}
                    suffix="%"
                  />
                }
                helpText="vs période précédente"
              />
              <StatCard
                title="Rendez-vous"
                value={String(stats.appointments.total)}
                icon={<CalendarCheck2 className="size-4" />}
                trend={
                  <TrendBadge
                    value={stats.appointments.trendPercent}
                    suffix="%"
                  />
                }
                helpText="vs période précédente"
              />
              <StatCard
                title="Nouveaux patients"
                value={String(stats.newPatients.value)}
                icon={<UserPlus2 className="size-4" />}
                trend={
                  <TrendBadge
                    value={stats.newPatients.trendPercent}
                    suffix="%"
                  />
                }
                helpText="vs période précédente"
              />
              <StatCard
                title="Taux d'annulation / no-show"
                value={`${stats.cancellationRate.value}%`}
                icon={<XCircle className="size-4" />}
                trend={
                  <TrendBadge
                    value={stats.cancellationRate.trendPoints}
                    suffix=" pts"
                    invert
                  />
                }
                helpText="vs période précédente"
              />
            </div>

            {/* Répartition par statut + par type de soin */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Répartition par statut
                  </CardTitle>
                  <CardDescription>
                    Sur les {stats.appointments.total} rendez-vous de la période.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {(
                    Object.keys(
                      STATUS_LABELS,
                    ) as (keyof typeof STATUS_LABELS)[]
                  ).map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="font-medium tabular-nums">
                        {stats.appointments.byStatus[status]}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Répartition par type de soin
                  </CardTitle>
                  <CardDescription>
                    Top {TOP_SERVICE_TYPES} des soins (annulations exclues).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topServices.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Aucun rendez-vous sur la période.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {topServices.map((service) => (
                        <li
                          key={service.type}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">{service.type}</span>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Badge variant="secondary">
                              {service.count} RDV
                            </Badge>
                            {service.revenue > 0 && (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {currencyFormatter.format(service.revenue)}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
