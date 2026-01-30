"use client";

/**
 * Page Calendrier / Agenda (Story 3.2).
 *
 * Affiche l'agenda du praticien sous forme de grille interactive:
 * - Vue Jour: une colonne avec créneaux 8h–20h
 * - Vue Semaine: 7 colonnes avec les mêmes créneaux
 *
 * Les rendez-vous sont chargés via une Server Action et mis en cache
 * dans useCalendarStore pour des transitions fluides. La navigation
 * (précédent / suivant / aujourd'hui) et le mode de vue (jour / semaine)
 * sont gérés par le store.
 *
 * Sur mobile: le détail d'un RDV s'ouvre dans un Sheet (drawer) en bas.
 *
 * @module app/dashboard/calendar/page
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, setHours, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";
import { getAppointmentsByDateRange } from "@/app/dashboard/calendar/actions";
import {
  useCalendarStore,
  getCacheKeyForView,
} from "@/stores/useCalendarStore";
import type { AppointmentWithPatient } from "@/types";

/** Heure de début de la grille (pour calcul de la plage de fetch) */
const GRID_START_HOUR = 8;
/** Heure de fin de la grille */
const GRID_END_HOUR = 20;

/**
 * Calcule la plage [startDate, endDate] pour la requête selon la vue.
 * - Jour: le jour pivot de 8h à 20h.
 * - Semaine / Mois (hors périmètre vue mois): du lundi 8h au dimanche 20h de la semaine du pivot.
 */
function getDateRange(
  pivotDate: Date,
  viewMode: "day" | "week" | "month"
) {
  if (viewMode === "day") {
    const start = setHours(pivotDate, GRID_START_HOUR);
    const end = setHours(pivotDate, GRID_END_HOUR);
    return { startDate: start, endDate: end };
  }
  const startOfWeekDate = startOfWeek(pivotDate, { weekStartsOn: 1 });
  const startDate = setHours(startOfWeekDate, GRID_START_HOUR);
  const endDate = setHours(addDays(startOfWeekDate, 6), GRID_END_HOUR);
  return { startDate, endDate };
}

/**
 * Répartit les rendez-vous par jour (clé YYYY-MM-DD) pour l'affichage dans la grille.
 */
function groupAppointmentsByDay(
  appointments: AppointmentWithPatient[]
): Record<string, AppointmentWithPatient[]> {
  const byDay: Record<string, AppointmentWithPatient[]> = {};
  for (const apt of appointments) {
    const key = format(apt.startTime, "yyyy-MM-dd");
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(apt);
  }
  return byDay;
}

export default function CalendarPage() {
  const pivotDate = useCalendarStore((s) => s.pivotDate);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const showCancelled = useCalendarStore((s) => s.showCancelled);
  const getAppointments = useCalendarStore((s) => s.getAppointments);
  const setAppointments = useCalendarStore((s) => s.setAppointments);

  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithPatient | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cacheKey = useMemo(
    () => getCacheKeyForView(pivotDate, viewMode),
    [pivotDate, viewMode]
  );

  const fetchAndCache = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(pivotDate, viewMode);
      const list = await getAppointmentsByDateRange(
        startDate,
        endDate,
        showCancelled
      );
      setAppointments(cacheKey, list);
    } finally {
      setLoading(false);
    }
  }, [pivotDate, viewMode, showCancelled, cacheKey, setAppointments]);

  // Charger les RDV: utiliser le cache si disponible, sinon fetch
  useEffect(() => {
    const cached = getAppointments(cacheKey);
    if (cached !== null) {
      return;
    }
    fetchAndCache();
  }, [cacheKey, getAppointments, fetchAndCache]);

  /** RDV en cache (typés WithPatient car remplis par getAppointmentsByDateRange) */
  const appointments = useMemo((): AppointmentWithPatient[] => {
    const cached = getAppointments(cacheKey);
    return (cached ?? []) as AppointmentWithPatient[];
  }, [cacheKey, getAppointments]);

  const byDay = useMemo(
    () => groupAppointmentsByDay(appointments),
    [appointments]
  );

  const dayContent = useMemo(() => {
    const content: Record<string, React.ReactNode> = {};
    for (const [dayKey, list] of Object.entries(byDay)) {
      content[dayKey] = (
        <>
          {list.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onSelect={(apt) => {
                setSelectedAppointment(apt);
                setDrawerOpen(true);
              }}
            />
          ))}
        </>
      );
    }
    return content;
  }, [byDay]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedAppointment(null);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Agenda</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <CalendarHeader />

          {loading && (
            <p className="text-sm text-muted-foreground">
              Chargement des rendez-vous…
            </p>
          )}

          {/* Grille responsive: scroll horizontal sur mobile si vue semaine */}
        <div className="min-w-0 flex-1 overflow-auto md:overflow-visible">
            <CalendarGrid
              pivotDate={pivotDate}
              viewMode={viewMode}
              dayContent={dayContent}
            />
          </div>
        </div>

        {/* Drawer mobile: détail du RDV au clic (Story 3.2 Task 6) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[80vh] overflow-y-auto rounded-t-xl"
          >
            <SheetHeader>
              <SheetTitle>Détail du rendez-vous</SheetTitle>
              <SheetDescription>
                {selectedAppointment
                  ? `${selectedAppointment.patient.firstName} ${selectedAppointment.patient.lastName}`
                  : ""}
              </SheetDescription>
            </SheetHeader>
            {selectedAppointment && (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Patient :</span>{" "}
                  {selectedAppointment.patient.firstName}{" "}
                  {selectedAppointment.patient.lastName}
                </p>
                <p>
                  <span className="font-medium">Heure :</span>{" "}
                  {format(selectedAppointment.startTime, "HH:mm", {
                    locale: fr,
                  })}{" "}
                  –{" "}
                  {format(selectedAppointment.endTime, "HH:mm", {
                    locale: fr,
                  })}
                </p>
                <p>
                  <span className="font-medium">Durée :</span>{" "}
                  {Math.round(
                    (selectedAppointment.endTime.getTime() -
                      selectedAppointment.startTime.getTime()) /
                      (60 * 1000)
                  )}{" "}
                  min
                </p>
                <p>
                  <span className="font-medium">Statut :</span>{" "}
                  {selectedAppointment.status}
                </p>
                <p>
                  <span className="font-medium">Type :</span>{" "}
                  {selectedAppointment.type}
                </p>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </SidebarInset>
    </SidebarProvider>
  );
}
