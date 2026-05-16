"use client";

/**
 * En-tête du calendrier (Story 3.2 - Task 1).
 *
 * Refonte UI/UX :
 * - Titre dégradé "Semaine du 18 au 24 mai" + sous-titre avec un pulse dot vert
 *   indiquant le nombre de rendez-vous actifs sur la période.
 * - Navigation compacte (précédent / aujourd'hui / suivant) avec hover surélevé.
 * - Toggle Jour / Semaine façon segmented control avec icônes Sun / Calendar.
 * - CTA principal "Nouveau RDV" coloré (palette secondary = vert médical) avec
 *   animation du Plus au hover.
 *
 * S'appuie sur useCalendarStore pour pivotDate et viewMode, et appelle
 * goToPrevious, goToToday, goToNext, setViewMode.
 *
 * @module components/calendar/CalendarHeader
 */

import { format, isSameDay, isSameMonth, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCalendarStore,
  type ViewMode,
} from "@/stores/useCalendarStore";

/** Options de vue affichées dans le segmented control (avec leur icône). */
const VIEW_OPTIONS: { value: ViewMode; label: string; Icon: typeof Sun }[] = [
  { value: "day", label: "Jour", Icon: Sun },
  { value: "week", label: "Semaine", Icon: CalendarRange },
];

/**
 * Construit le titre de la période selon le mode (jour ou semaine).
 * - Jour: "Mercredi 29 janvier 2026"
 * - Semaine (même mois): "Semaine du 18 au 24 mai"
 * - Semaine (mois différents): "Semaine du 28 avr. au 4 mai"
 */
function getPeriodTitle(pivotDate: Date, viewMode: ViewMode): string {
  if (viewMode === "day") {
    return format(pivotDate, "EEEE d MMMM yyyy", { locale: fr });
  }
  const start = startOfWeek(pivotDate, { weekStartsOn: 1 });
  const end = addDays(start, 6);
  // Si la semaine couvre un seul mois, on factorise le mois (compact et lisible).
  if (isSameMonth(start, end)) {
    return `Semaine du ${format(start, "d", { locale: fr })} au ${format(end, "d MMMM", { locale: fr })}`;
  }
  return `Semaine du ${format(start, "d MMM", { locale: fr })} au ${format(end, "d MMM yyyy", { locale: fr })}`;
}

/** Indique si la date pivot est aujourd'hui (pour styliser le bouton "Aujourd'hui"). */
function isToday(pivotDate: Date): boolean {
  return isSameDay(pivotDate, new Date());
}

export interface CalendarHeaderProps {
  /** Nombre total de RDV actifs (non-annulés) sur la période affichée. */
  appointmentCount?: number;
  /** Handler du CTA "Nouveau RDV" (ouvre la modal de création sans pré-remplir). */
  onNewAppointment?: () => void;
}

export function CalendarHeader({
  appointmentCount = 0,
  onNewAppointment,
}: CalendarHeaderProps) {
  const pivotDate = useCalendarStore((s) => s.pivotDate);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const goToPrevious = useCalendarStore((s) => s.goToPrevious);
  const goToNext = useCalendarStore((s) => s.goToNext);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const setViewMode = useCalendarStore((s) => s.setViewMode);

  const periodTitle = getPeriodTitle(pivotDate, viewMode);
  const today = isToday(pivotDate);
  const countLabel = `${appointmentCount} rendez-vous actif${appointmentCount > 1 ? "s" : ""}`;

  return (
    <header
      className={cn(
        // Fade-in + slide depuis le haut au montage pour une entrée douce.
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        "animate-in fade-in slide-in-from-top-2 duration-500"
      )}
    >
      {/* ===== Bloc gauche : Titre + sous-titre compteur ===== */}
      <div className="space-y-1.5">
        {/* Titre principal avec dégradé subtil pour la profondeur visuelle */}
        <h2 className="text-xl font-bold capitalize tracking-tight md:text-2xl">
          <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {periodTitle}
          </span>
        </h2>

        {/* Sous-titre : pulse dot vert + compteur de RDV actifs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            {/* Pulse animé en arrière-plan (visible uniquement s'il y a des RDV) */}
            {appointmentCount > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                appointmentCount > 0 ? "bg-emerald-500" : "bg-muted-foreground/40"
              )}
            />
          </span>
          <span className="font-medium">{countLabel}</span>
        </div>
      </div>

      {/* ===== Bloc droit : Contrôles + CTA ===== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* --- Groupe Navigation : précédent / aujourd'hui / suivant --- */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-md transition-transform hover:-translate-x-0.5"
            onClick={() => goToPrevious()}
            aria-label="Période précédente"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant={today ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "rounded-md font-medium",
              today && "shadow-sm shadow-secondary/30"
            )}
            onClick={() => goToToday()}
            aria-label="Aller à aujourd'hui"
          >
            <CalendarDays />
            Aujourd&apos;hui
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-md transition-transform hover:translate-x-0.5"
            onClick={() => goToNext()}
            aria-label="Période suivante"
          >
            <ChevronRight />
          </Button>
        </div>

        {/* --- Segmented control Jour / Semaine --- */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {VIEW_OPTIONS.map((opt) => {
            const active = viewMode === opt.value;
            const Icon = opt.Icon;
            return (
              <Button
                key={opt.value}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-md font-medium transition-all",
                  active && "shadow-sm shadow-secondary/30"
                )}
                onClick={() => setViewMode(opt.value)}
                aria-label={`Vue ${opt.label}`}
                aria-pressed={active}
              >
                <Icon className={cn("transition-transform", active && "scale-110")} />
                {opt.label}
              </Button>
            );
          })}
        </div>

        {/* --- CTA principal : Nouveau RDV (palette secondary = vert médical) --- */}
        <Button
          onClick={onNewAppointment}
          className={cn(
            "group bg-secondary text-secondary-foreground",
            "shadow-sm shadow-secondary/40 transition-all",
            "hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-md hover:shadow-secondary/50"
          )}
          aria-label="Créer un nouveau rendez-vous"
        >
          <Plus className="transition-transform group-hover:rotate-90" />
          Nouveau RDV
        </Button>
      </div>
    </header>
  );
}
