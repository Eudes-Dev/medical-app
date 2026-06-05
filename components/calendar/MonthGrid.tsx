"use client";

/**
 * Grille **mensuelle** de l'agenda (Story 8.3).
 *
 * Paradigme distinct de `CalendarGrid` (grille horaire jour/semaine) : ici une
 * matrice calendaire de 7 colonnes (Lun→Dim) × 5–6 lignes, chaque cellule = un
 * jour avec son volume de RDV. La vue est **lecture seule** :
 * - pas de glisser-déposer ni de clic-créneau (story 8.2 / 3.3 hors périmètre) ;
 * - cliquer (ou activer au clavier) une cellule fait un **drill-down** vers la
 *   vue jour via `onSelectDay(date)`.
 *
 * Langage visuel cohérent avec `CalendarGrid` : « aujourd'hui » en accent
 * `primary`, surcharge (`count >= OVERLOAD_THRESHOLD`) en `rose`, congés/fériés
 * (story 7.2) signalés de façon informative et non bloquante. Raisonnement en
 * **heure locale** (convention dashboard) — pas de helper Paris (REL-001).
 *
 * @module components/calendar/MonthGrid
 */

import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { getServiceColor } from "@/lib/cabinet/service-colors";
import type { AppointmentWithPatient } from "@/types";
import { OVERLOAD_THRESHOLD } from "./calendar-utils";
import { buildMonthMatrix } from "./month-utils";
import type { CalendarTimeOff } from "./CalendarGrid";

/** En-têtes de colonnes (lundi → dimanche, cohérent avec `weekStartsOn: 1`). */
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Nombre maximum de pastilles de RDV affichées dans une cellule avant « +N ». */
const MAX_PILLS = 3;

export interface MonthGridProps {
  /** Date pivot : n'importe quel jour du mois à afficher. */
  pivotDate: Date;
  /** RDV regroupés par jour (clé `YYYY-MM-DD` locale). */
  appointmentsByDay?: Record<string, AppointmentWithPatient[]>;
  /** Exceptions d'agenda (congés / fériés, story 7.2) — informatif, non bloquant. */
  timeOffs?: CalendarTimeOff[];
  /** Drill-down : appelé avec la date du jour cliqué/activé au clavier. */
  onSelectDay: (date: Date) => void;
}

/** Clé jour locale `YYYY-MM-DD` (convention dashboard, pas de TZ Paris). */
function localDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Retourne la 1ʳᵉ exception couvrant `date` (comparaison en **jour local** :
 * l'ordre lexicographique des chaînes `YYYY-MM-DD` est l'ordre chronologique),
 * ou `null`. ⚠️ Ne PAS utiliser `dayKey` de `@/lib/cabinet/time-off` (Paris).
 *
 * Choix assumé (AC 5) : on signale le **jour entier** dès qu'une exception le
 * couvre, y compris pour un congé **partiel** (intra-journée). La vue mois est
 * volontairement minimale (marqueur + `aria-label`, pas de plage horaire) — le
 * détail horaire reste sur la vue jour/semaine (`getTimeOffOverlays` de
 * `CalendarGrid`). On ne réutilise donc pas `isDayFullyBlocked` (filtre `allDay`)
 * qui masquerait les congés partiels, non désiré ici.
 */
function findTimeOffForDay(
  date: Date,
  timeOffs: CalendarTimeOff[],
): CalendarTimeOff | null {
  const k = localDayKey(date);
  return (
    timeOffs.find(
      (t) => localDayKey(t.startDate) <= k && k <= localDayKey(t.endDate),
    ) ?? null
  );
}

/** Une cellule-jour de la grille mensuelle. */
function MonthDayCell({
  date,
  inCurrentMonth,
  appointments,
  timeOff,
  onSelectDay,
}: {
  date: Date;
  inCurrentMonth: boolean;
  appointments: AppointmentWithPatient[];
  timeOff: CalendarTimeOff | null;
  onSelectDay: (date: Date) => void;
}) {
  const isCurrentDay = isSameDay(date, new Date());
  // RDV actifs uniquement (les annulés ne comptent pas dans la charge).
  const active = appointments.filter((a) => a.status !== "CANCELLED");
  const count = active.length;
  const overloaded = count >= OVERLOAD_THRESHOLD;
  const dayNumber = format(date, "d");

  // Échantillon de pastilles (les premiers RDV de la journée), triés par heure.
  const sample = [...active]
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, MAX_PILLS);
  const extra = count - sample.length;

  const timeOffLabel = timeOff
    ? timeOff.reason ??
      (timeOff.source === "HOLIDAY" ? "Jour férié" : "Congé")
    : null;

  // aria-label explicite : date + charge + éventuelle exception.
  const dateLabel = format(date, "d MMMM yyyy", { locale: fr });
  const countLabel =
    count === 0
      ? "aucun rendez-vous"
      : `${count} rendez-vous`;
  const ariaLabel = [
    `${dateLabel}, ${countLabel}`,
    timeOffLabel ? `— ${timeOffLabel}` : null,
    "— ouvrir la journée",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={() => onSelectDay(date)}
      aria-label={ariaLabel}
      aria-current={isCurrentDay ? "date" : undefined}
      className={cn(
        "group relative flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors",
        "hover:bg-primary/5 focus:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
        // Débordements de semaine : atténués mais cliquables.
        !inCurrentMonth && "bg-muted/30 text-muted-foreground",
        // Surcharge : teinte rose (cohérent avec l'en-tête de jour surchargé).
        overloaded && "bg-rose-50/60 dark:bg-rose-950/20",
      )}
    >
      {/* Ligne d'en-tête de cellule : n° de jour + badge compteur + marqueur congé */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            isCurrentDay && "bg-primary text-primary-foreground",
            !isCurrentDay && inCurrentMonth && "text-foreground",
          )}
        >
          {dayNumber}
        </span>

        <span className="flex items-center gap-1">
          {timeOff && (
            <span
              className={cn(
                "inline-flex h-1.5 w-1.5 rounded-full",
                timeOff.source === "HOLIDAY" ? "bg-amber-500" : "bg-rose-500",
              )}
              title={timeOffLabel ?? undefined}
              aria-hidden
            />
          )}
          {count > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                overloaded
                  ? "bg-rose-500 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          )}
        </span>
      </div>

      {/* Pastilles de RDV (lecture seule) : couleur du service + nom patient. */}
      <span className="flex min-h-0 flex-col gap-0.5">
        {sample.map((apt) => (
          <span
            key={apt.id}
            className="flex items-center gap-1 truncate rounded-sm bg-muted/60 px-1 py-0.5 text-[10px] leading-tight text-foreground/80"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                getServiceColor(apt.serviceColor).dot,
              )}
              aria-hidden
            />
            <span className="truncate">
              {format(apt.startTime, "HH:mm")} {apt.patient.lastName}
            </span>
          </span>
        ))}
        {extra > 0 && (
          <span className="px-1 text-[10px] font-medium text-muted-foreground">
            +{extra}
          </span>
        )}
      </span>
    </button>
  );
}

export function MonthGrid({
  pivotDate,
  appointmentsByDay = {},
  timeOffs = [],
  onSelectDay,
}: MonthGridProps) {
  const cells = buildMonthMatrix(pivotDate);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "animate-in fade-in duration-300",
      )}
    >
      {/* ===== En-têtes de colonnes (Lun→Dim) ===== */}
      <div className="grid grid-cols-7 border-b border-border bg-card/95">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* ===== Matrice des jours ===== */}
      <div className="grid grid-cols-7">
        {cells.map(({ date, inCurrentMonth }) => (
          <MonthDayCell
            key={localDayKey(date)}
            date={date}
            inCurrentMonth={inCurrentMonth}
            appointments={appointmentsByDay[localDayKey(date)] ?? []}
            timeOff={findTimeOffForDay(date, timeOffs)}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>

      {/* Légende discrète : rappel du caractère lecture seule + drill-down. */}
      <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        <CalendarOff className="h-3 w-3" aria-hidden />
        <span>Cliquez un jour pour ouvrir la vue détaillée.</span>
      </div>
    </div>
  );
}
