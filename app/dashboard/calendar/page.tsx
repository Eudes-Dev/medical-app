"use client";

/**
 * Page Calendrier / Agenda (Story 3.2, 3.3).
 *
 * Affiche l'agenda du praticien sous forme de grille interactive:
 * - Vue Jour: une colonne avec créneaux 8h–20h
 * - Vue Semaine: 7 colonnes avec les mêmes créneaux
 *
 * Story 3.3: Clic sur un créneau vide ouvre la modal de création de RDV;
 * clic sur un RDV ouvre le détail avec options (modifier, statut, supprimer).
 * Sur mobile le détail s'ouvre en Sheet (drawer), sur desktop en Dialog.
 *
 * @module app/dashboard/calendar/page
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, setHours, startOfWeek } from "date-fns";

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
  CalendarGrid,
  getSlotStartTime,
} from "@/components/calendar/CalendarGrid";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";
import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
import { AppointmentDetailsModal } from "@/components/calendar/AppointmentDetailsModal";
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
  /** RDV sélectionné: ouvre le modal de détails (Story 3.3) */
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentWithPatient | null>(null);
  /** Modal de création: ouverte au clic sur un créneau vide (Story 3.3) */
  const [createModalOpen, setCreateModalOpen] = useState(false);
  /** Date/heure de début pré-remplies pour la création (créneau cliqué) */
  const [createModalDefaultStart, setCreateModalDefaultStart] = useState<
    Date | undefined
  >(undefined);

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
              onSelect={(apt) => setSelectedAppointment(apt)}
            />
          ))}
        </>
      );
    }
    return content;
  }, [byDay]);

  /** Clic sur un créneau vide: ouvre la modal de création avec date/heure pré-remplies */
  const handleSlotClick = useCallback((date: Date, slotIndex: number) => {
    setCreateModalDefaultStart(getSlotStartTime(date, slotIndex));
    setCreateModalOpen(true);
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

          {/* Grille: clic créneau vide = création RDV, clic RDV = détail (Story 3.3) */}
          <div className="min-w-0 flex-1 overflow-auto md:overflow-visible">
            <CalendarGrid
              pivotDate={pivotDate}
              viewMode={viewMode}
              dayContent={dayContent}
              onSlotClick={handleSlotClick}
            />
          </div>
        </div>

        {/* Modal de création de RDV (clic sur créneau vide) */}
        <CreateAppointmentModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          defaultStartTime={createModalDefaultStart}
        />

        {/* Modal de détails RDV (clic sur un RDV) — Dialog desktop, Sheet mobile */}
        <AppointmentDetailsModal
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
          appointment={selectedAppointment}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
