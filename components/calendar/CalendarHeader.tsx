"use client";

/**
 * En-tête du calendrier (Story 3.2 - Task 1).
 *
 * Affiche:
 * - Le titre de la période courante (ex: "Semaine du 20 janvier 2026" ou "Mercredi 29 janvier 2026")
 * - Les boutons de navigation: précédent, aujourd'hui, suivant
 * - Le sélecteur de vue: jour / semaine
 *
 * S'appuie sur useCalendarStore pour pivotDate et viewMode, et appelle
 * goToPrevious, goToToday, goToNext, setViewMode.
 *
 * @module components/calendar/CalendarHeader
 */

import { format, isSameDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useCalendarStore,
  type ViewMode,
} from "@/stores/useCalendarStore";

/** Options de vue affichées dans le sélecteur */
const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
];

/**
 * Formate le titre de la période selon le mode (jour ou semaine).
 * - Jour: "Mercredi 29 janvier 2026"
 * - Semaine: "Semaine du 20 janvier 2026" (début de semaine)
 */
function getPeriodTitle(pivotDate: Date, viewMode: ViewMode): string {
  if (viewMode === "day") {
    return format(pivotDate, "EEEE d MMMM yyyy", { locale: fr });
  }
  // Vue semaine: on affiche "Semaine du [premier jour de la semaine]"
  const start = startOfWeek(pivotDate, { weekStartsOn: 1 });
  return `Semaine du ${format(start, "d MMMM yyyy", { locale: fr })}`;
}

/**
 * Indique si la date pivot est aujourd'hui (pour désactiver ou styliser "Aujourd'hui").
 */
function isToday(pivotDate: Date): boolean {
  return isSameDay(pivotDate, new Date());
}

export function CalendarHeader() {
  const pivotDate = useCalendarStore((s) => s.pivotDate);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const goToPrevious = useCalendarStore((s) => s.goToPrevious);
  const goToNext = useCalendarStore((s) => s.goToNext);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const setViewMode = useCalendarStore((s) => s.setViewMode);

  const periodTitle = getPeriodTitle(pivotDate, viewMode);
  const today = isToday(pivotDate);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Titre de la période */}
      <h2 className="text-lg font-semibold capitalize text-foreground md:text-xl">
        {periodTitle}
      </h2>

      {/* Contrôles: navigation + sélecteur de vue */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation: précédent / aujourd'hui / suivant */}
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPrevious()}
            aria-label="Période précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={today ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-3"
            onClick={() => goToToday()}
            aria-label="Aller à aujourd'hui"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToNext()}
            aria-label="Période suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Sélecteur de vue: Jour / Semaine */}
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          {VIEW_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={viewMode === opt.value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode(opt.value)}
              aria-label={`Vue ${opt.label}`}
              aria-pressed={viewMode === opt.value}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
