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
  type CalendarTimeOff,
} from "@/components/calendar/CalendarGrid";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { getMonthFetchRange } from "@/components/calendar/month-utils";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
} from "@/components/calendar/calendar-utils";
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CalendarOff } from "lucide-react";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";
import { CreateAppointmentModal } from "@/components/calendar/CreateAppointmentModal";
import { AppointmentDetailsModal } from "@/components/calendar/AppointmentDetailsModal";
import { getAppointmentsByDateRange } from "@/app/dashboard/calendar/actions";
import { moveAppointment } from "@/app/dashboard/calendar/move-appointment";
import { getTimeOffsByDateRange } from "@/app/dashboard/settings/timeoff/actions";
import {
  useCalendarStore,
  getCacheKeyForView,
} from "@/stores/useCalendarStore";
import type { AppointmentWithPatient } from "@/types";

/**
 * Calcule la plage [startDate, endDate] pour la requête selon la vue.
 * - Jour: le jour pivot de 8h à 20h.
 * - Semaine: du lundi 8h au dimanche 20h de la semaine du pivot.
 * - Mois (story 8.3): toutes les cellules visibles (lundi de la 1ʳᵉ semaine 8h →
 *   dimanche de la dernière semaine 20h), délégué à `getMonthFetchRange`.
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
  if (viewMode === "month") {
    return getMonthFetchRange(pivotDate);
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
  const setDate = useCalendarStore((s) => s.setDate);
  const setViewMode = useCalendarStore((s) => s.setViewMode);

  const [loading, setLoading] = useState(false);
  /** Créneau cible surligné pendant un glisser-déposer (story 8.2). */
  const [dropTarget, setDropTarget] = useState<
    { dayKey: string; slotIndex: number } | null
  >(null);
  /** Exceptions actives (story 7.2) sur la plage affichée. Hors du store
   * `useCalendarStore` car non couvertes par son cache existant ; rafraîchies
   * en parallèle des RDV pour rester synchronisées avec la navigation. */
  const [timeOffs, setTimeOffs] = useState<CalendarTimeOff[]>([]);
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
      const [list, offs] = await Promise.all([
        getAppointmentsByDateRange(startDate, endDate, showCancelled),
        getTimeOffsByDateRange(startDate, endDate),
      ]);
      setAppointments(cacheKey, list);
      setTimeOffs(offs);
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

  /**
   * Compteur de RDV actifs par jour (clé YYYY-MM-DD).
   * On exclut les RDV annulés pour le badge de chaque colonne, car ils ne
   * comptent pas dans la charge réelle de la journée.
   */
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [dayKey, list] of Object.entries(byDay)) {
      counts[dayKey] = list.filter((a) => a.status !== "CANCELLED").length;
    }
    return counts;
  }, [byDay]);

  /** Total de RDV actifs sur la période affichée (utilisé dans le sous-titre du header). */
  const activeAppointmentCount = useMemo(
    () => appointments.filter((a) => a.status !== "CANCELLED").length,
    [appointments]
  );

  /** Surlignage du créneau cible pendant un drag (story 8.2). */
  const handleDropTargetChange = useCallback(
    (target: { day: Date; slotIndex: number } | null) => {
      setDropTarget(
        target
          ? { dayKey: format(target.day, "yyyy-MM-dd"), slotIndex: target.slotIndex }
          : null
      );
    },
    []
  );

  /**
   * Dépôt d'un RDV sur un créneau (story 8.2) : déplacement optimiste + revert,
   * délégué à `moveAppointment` (réutilise la Server Action `updateAppointment`).
   */
  const handleMove = useCallback(
    (appointment: AppointmentWithPatient, day: Date, slotIndex: number) => {
      void moveAppointment({
        appointment,
        day,
        slotIndex,
        cacheKey,
        getAppointments,
        setAppointments,
      });
    },
    [cacheKey, getAppointments, setAppointments]
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
              onMove={handleMove}
              onDropTargetChange={handleDropTargetChange}
            />
          ))}
        </>
      );
    }
    return content;
  }, [byDay, handleMove, handleDropTargetChange]);

  /** Clic sur un créneau vide: ouvre la modal de création avec date/heure pré-remplies */
  const handleSlotClick = useCallback((date: Date, slotIndex: number) => {
    setCreateModalDefaultStart(getSlotStartTime(date, slotIndex));
    setCreateModalOpen(true);
  }, []);

  /**
   * Clic sur le CTA "Nouveau RDV" du header : ouvre la modal sans pré-remplir
   * (l'utilisateur choisit lui-même la date/heure dans le formulaire).
   */
  const handleNewAppointment = useCallback(() => {
    setCreateModalDefaultStart(undefined);
    setCreateModalOpen(true);
  }, []);

  /**
   * Drill-down vue mois → vue jour (story 8.3, AC 6) : on positionne la date
   * pivot sur le jour cliqué puis on bascule en vue jour. Le changement de
   * `cacheKey` (mois → jour) re-déclenche le fetch via l'effet existant.
   */
  const handleSelectDay = useCallback(
    (date: Date) => {
      setDate(date);
      setViewMode("day");
    },
    [setDate, setViewMode]
  );

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

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {/* Header : titre + compteur RDV actifs + nav + toggle vue + CTA */}
          <CalendarHeader
            appointmentCount={activeAppointmentCount}
            onNewAppointment={handleNewAppointment}
          />

          {/* Grille: clic créneau vide = création RDV, clic RDV = détail (Story 3.3).
              Story 5.1 AC 1 : on affiche le CalendarSkeleton tant que le premier
              fetch n'a pas répondu (cache vide + loading). Une fois des données
              en cache, on garde la grille visible pour ne pas faire flasher
              l'utilisateur entre deux navigations. */}
          <div className="min-w-0 flex-1 overflow-auto md:overflow-visible">
            {loading && appointments.length === 0 ? (
              <CalendarSkeleton />
            ) : viewMode === "month" ? (
              /* Vue mois (story 8.3) : on affiche toujours la grille, même vide
                 (les jours libres sont l'information utile) — pas d'EmptyState. */
              <MonthGrid
                pivotDate={pivotDate}
                appointmentsByDay={byDay}
                timeOffs={timeOffs}
                onSelectDay={handleSelectDay}
              />
            ) : viewMode === "day" && activeAppointmentCount === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="Aucun rendez-vous ce jour"
                description="Profitez-en pour rattraper du retard administratif ou planifier votre semaine."
                action={
                  <Button onClick={handleNewAppointment}>
                    Nouveau rendez-vous
                  </Button>
                }
              />
            ) : (
              <CalendarGrid
                pivotDate={pivotDate}
                viewMode={viewMode}
                dayContent={dayContent}
                dayCounts={dayCounts}
                onSlotClick={handleSlotClick}
                timeOffs={timeOffs}
                dropTarget={dropTarget}
              />
            )}
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
