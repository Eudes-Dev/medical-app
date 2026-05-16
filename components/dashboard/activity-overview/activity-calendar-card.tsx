"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { DEFAULT_ACTIVITY_MONTH, MONTH_LABELS_FR } from "./data";
import type { ActivityDay, ActivityMonth } from "./types";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** Classes Tailwind par intensité — sur fond sombre (slate-950). */
const INTENSITY_CLASSES: Record<ActivityDay["intensity"], string> = {
  0: "bg-white/[0.06] text-white/30",
  1: "bg-primary/30 text-white/70",
  2: "bg-primary/55 text-white/90",
  3: "bg-primary/75 text-white",
  4: "bg-primary text-primary-foreground",
};

interface ActivityCalendarCardProps {
  month?: ActivityMonth;
  className?: string;
}

export function ActivityCalendarCard({
  month = DEFAULT_ACTIVITY_MONTH,
  className,
}: ActivityCalendarCardProps) {
  const cells = React.useMemo(() => buildGrid(month), [month]);
  const title = `${MONTH_LABELS_FR[month.month - 1]} ${month.year}`.toUpperCase();

  return (
    <section
      aria-label={`Activité ${title}`}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm ring-1 ring-white/5",
        "transition-all duration-300 ease-out hover:shadow-xl hover:ring-white/10",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      {/* Halo radial subtil en fond */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-primary/20 blur-3xl"
      />

      <header className="relative flex items-center justify-between px-5 pt-5 pb-3">
        <button
          type="button"
          aria-label="Mois précédent"
          className="flex size-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold tracking-[0.2em] tabular-nums">
          {title}
        </p>
        <button
          type="button"
          aria-label="Mois suivant"
          className="flex size-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </header>

      <div className="relative px-5 pb-5">
        {/* En-têtes jours */}
        <div
          role="row"
          className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-white/40"
        >
          {WEEKDAYS.map((day, i) => (
            <span key={`${day}-${i}`}>{day}</span>
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, index) =>
            cell ? (
              <DayCell key={index} cell={cell} todayDay={month.todayDay} delay={index * 12} />
            ) : (
              <span key={index} aria-hidden className="aspect-square" />
            ),
          )}
        </div>

        <Legend />
      </div>
    </section>
  );
}

interface DayCellProps {
  cell: ActivityDay;
  todayDay?: number;
  delay: number;
}

function DayCell({ cell, todayDay, delay }: DayCellProps) {
  const isToday = todayDay === cell.day;
  return (
    <button
      type="button"
      aria-label={`Jour ${cell.day}, intensité ${cell.intensity}/4`}
      className={cn(
        "group/cell relative flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
        "transition-all duration-200 ease-out hover:scale-110 hover:z-10",
        INTENSITY_CLASSES[cell.intensity],
        isToday && "ring-2 ring-white ring-offset-2 ring-offset-slate-950",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-300 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {isToday ? cell.day : null}
    </button>
  );
}

function Legend() {
  return (
    <div className="mt-5 flex items-center justify-center gap-5 text-[11px] text-white/60">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-white/[0.08]" />
        <span>Calme</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-primary" />
        <span>Chargé</span>
      </div>
    </div>
  );
}

/**
 * Construit la grille calendaire : `null` pour les cellules
 * vides avant le 1er jour du mois.
 */
function buildGrid(month: ActivityMonth): (ActivityDay | null)[] {
  const cells: (ActivityDay | null)[] = [];
  for (let i = 0; i < month.firstWeekday; i++) cells.push(null);
  for (const day of month.days) cells.push(day);
  // Compléter la dernière ligne pour conserver la grille 7-col.
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
