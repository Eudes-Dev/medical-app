/**
 * Page d'accueil du Dashboard
 *
 * Vue d'ensemble de l'activité du cabinet:
 * - Statistiques du jour (RDV, patients)
 * - Prochains rendez-vous
 * - Activité récente
 *
 * Route: /dashboard
 *
 * @module app/dashboard/page
 */

import {
  AlertCircle,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Download,
  FileText,
  Gauge,
  Plus,
  UserPlus2,
  Video,
} from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import type {
  KpiCardData,
  KpiTrend,
} from "@/components/dashboard/kpi-cards";
import { TodayOverview } from "@/components/dashboard/today-overview";
import type {
  AlertItem,
  Consultation,
  ConsultationRange,
} from "@/components/dashboard/today-overview";
import { AlertsCard } from "@/components/dashboard/today-overview/alerts-card";
import { ConsultationsCard } from "@/components/dashboard/today-overview/consultations-card";
import { ActivityOverview } from "@/components/dashboard/activity-overview";
import { PatientsEvolutionCard } from "@/components/dashboard/activity-overview/patients-evolution-card";
import { TopTreatmentsCard } from "@/components/dashboard/activity-overview/top-treatments-card";
import { ActivityCalendarCard } from "@/components/dashboard/activity-overview/activity-calendar-card";
import { DailyAppointmentsTable } from "@/components/dashboard/daily-appointments";

import {
  getDashboardOverview,
  type DashboardAlerts,
  type DashboardKpis,
} from "./overview-data";

export const dynamic = "force-dynamic";

/**
 * Page principale du dashboard.
 */
export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  const kpiCards = buildKpiCards(overview.kpis);
  const alerts = buildAlerts(overview.alerts);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Contenu principal */}
        <div className="flex min-h-0 flex-1 flex-col gap-9 p-4">
          <OverviewHeader />

          <KpiCards cards={kpiCards} />

          <TodayOverviewSection
            alerts={alerts}
            consultations={overview.consultations}
          />

          <ActivityOverviewSection
            patientsEvolution={overview.patientsEvolution}
            topTreatments={
              overview.topTreatments.length > 0
                ? overview.topTreatments
                : undefined
            }
            activityMonth={overview.activityMonth}
          />

          <DailyAppointmentsTable
            appointments={overview.dailyAppointments.items}
            total={overview.dailyAppointments.total}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// ============================================================================
// Builders de props (server-side : icônes injectées ici)
// ============================================================================

function trendFromPercent(p: number): KpiTrend {
  if (p > 0) return "up";
  if (p < 0) return "down";
  return "neutral";
}

function buildKpiCards(kpis: DashboardKpis): KpiCardData[] {
  return [
    {
      id: "rdv-today",
      title: "RDV aujourd'hui",
      value: String(kpis.rdvToday.value),
      unit: `/ ${kpis.rdvToday.capacity}`,
      icon: <CalendarCheck2 />,
      tone: "primary",
      trend: trendFromPercent(kpis.rdvToday.trendPercent),
      trendLabel: `${kpis.rdvToday.trendPercent > 0 ? "+" : ""}${kpis.rdvToday.trendPercent}%`,
      trendIsPositive: kpis.rdvToday.trendPercent >= 0,
      data: kpis.rdvToday.sparkline,
    },
    {
      id: "new-patients",
      title: "Nouveaux patients",
      suffix: "(7j)",
      value: String(kpis.newPatients.value),
      icon: <UserPlus2 />,
      tone: "success",
      trend: trendFromPercent(kpis.newPatients.trendDelta),
      trendLabel: `${kpis.newPatients.trendDelta > 0 ? "+" : ""}${kpis.newPatients.trendDelta}`,
      trendIsPositive: kpis.newPatients.trendDelta >= 0,
      data: kpis.newPatients.sparkline,
    },
    {
      id: "fill-rate",
      title: "Taux de remplissage",
      value: String(kpis.fillRate.value),
      unit: "%",
      icon: <Gauge />,
      tone: "violet",
      trend: trendFromPercent(kpis.fillRate.trendPercent),
      trendLabel: `${kpis.fillRate.trendPercent > 0 ? "+" : ""}${kpis.fillRate.trendPercent}%`,
      trendIsPositive: kpis.fillRate.trendPercent >= 0,
      data: kpis.fillRate.sparkline,
    },
    {
      id: "no-shows",
      title: "No-shows",
      suffix: "(30j)",
      value: kpis.noShows.value.toFixed(1),
      unit: "%",
      icon: <AlertCircle />,
      tone: "amber",
      // Pour les no-shows une baisse est positive
      trend: trendFromPercent(kpis.noShows.trendPercent),
      trendLabel: `${kpis.noShows.trendPercent > 0 ? "+" : ""}${kpis.noShows.trendPercent}%`,
      trendIsPositive: kpis.noShows.trendPercent <= 0,
      data: kpis.noShows.sparkline,
    },
  ];
}

function buildAlerts(alerts: DashboardAlerts): AlertItem[] {
  const items: AlertItem[] = [];

  if (alerts.pendingCount > 0) {
    items.push({
      id: "rdv-confirm",
      title: "RDV à confirmer",
      description: `${alerts.pendingCount} demande${alerts.pendingCount > 1 ? "s" : ""} en attente`,
      tone: "warning",
      icon: <CalendarClock />,
      count: alerts.pendingCount,
    });
  }

  if (alerts.upcomingTeleconsultationCount > 0) {
    items.push({
      id: "teleconsultations",
      title: "Téléconsultations",
      description: `${alerts.upcomingTeleconsultationCount} à venir cette semaine`,
      tone: "primary",
      icon: <Video />,
      count: alerts.upcomingTeleconsultationCount,
    });
  }

  if (alerts.todayCancelledCount > 0) {
    items.push({
      id: "today-cancelled",
      title: "Annulations du jour",
      description: `${alerts.todayCancelledCount} RDV annulé${alerts.todayCancelledCount > 1 ? "s" : ""}`,
      tone: "danger",
      icon: <FileText />,
      count: alerts.todayCancelledCount,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "all-clear",
      title: "Aucune alerte",
      description: "Tout est à jour ✨",
      tone: "info",
      icon: <CalendarClock />,
    });
  }

  return items;
}

// ============================================================================
// Sections (server components qui passent les props dynamiques)
// ============================================================================

function TodayOverviewSection({
  alerts,
  consultations,
}: {
  alerts: AlertItem[];
  consultations: Record<ConsultationRange, Consultation[]>;
}) {
  // On reproduit la structure de TodayOverview (grid 1/3 + 2/3) pour pouvoir
  // injecter les props dynamiques aux deux sous-cards.
  void TodayOverview; // garde l'import pour le tree-shaking documenté
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AlertsCard alerts={alerts} className="lg:col-span-1" />
      <ConsultationsCard data={consultations} className="lg:col-span-2" />
    </div>
  );
}

function ActivityOverviewSection({
  patientsEvolution,
  topTreatments,
  activityMonth,
}: {
  patientsEvolution: Parameters<typeof PatientsEvolutionCard>[0]["data"];
  topTreatments: Parameters<typeof TopTreatmentsCard>[0]["treatments"];
  activityMonth: Parameters<typeof ActivityCalendarCard>[0]["month"];
}) {
  void ActivityOverview;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
      <PatientsEvolutionCard
        data={patientsEvolution}
        className="md:col-span-2 xl:col-span-3"
      />
      <TopTreatmentsCard
        treatments={topTreatments}
        className="xl:col-span-2"
      />
      <ActivityCalendarCard
        month={activityMonth}
        className="xl:col-span-2"
      />
    </div>
  );
}

function OverviewHeader() {
  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bonjour, Dr. Eudes
          </span>
          <span
            aria-hidden
            className="inline-block origin-[70%_70%] text-primary motion-safe:animate-[wave_2.4s_ease-in-out_infinite]"
          >
            👋
          </span>
        </h1>
        <p className="text-sm capitalize text-muted-foreground">
          {formattedDate}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="group bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <CalendarDays className="transition-transform group-hover:scale-110" />
          Aujourd&apos;hui
        </Button>
        <Button
          variant="outline"
          className="group bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Download className="transition-transform group-hover:translate-y-0.5" />
          Exporter
        </Button>
        <Button className="group shadow-sm shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/40">
          <Plus className="transition-transform group-hover:rotate-90" />
          Nouveau
        </Button>
      </div>
    </div>
  );
}
