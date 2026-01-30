"use client";

/**
 * Grille calendrier (Story 3.2 - Task 2).
 *
 * Affiche une grille avec:
 * - Axe vertical: heures de 8h à 20h, créneaux de 30 minutes (24 lignes).
 * - Axe horizontal: 1 jour (vue jour) ou 7 jours (vue semaine).
 * - Lignes de séparation des heures.
 *
 * Les rendez-vous sont rendus par le parent (page) et positionnés
 * dans les colonnes jour via des AppointmentCard.
 *
 * @module components/calendar/CalendarGrid
 */

import { addDays, format, setHours, setMinutes, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { ViewMode } from "@/stores/useCalendarStore";

/** Heure de début de la grille (inclus) */
const HOUR_START = 8;
/** Heure de fin de la grille (inclus, dernière ligne affichée) */
const HOUR_END = 20;
/** Nombre de créneaux de 30 minutes entre HOUR_START et HOUR_END */
const SLOT_COUNT = (HOUR_END - HOUR_START) * 2;

/**
 * Génère les libellés d'heures pour la colonne de gauche.
 * Ex: "8h00", "8h30", ..., "19h30".
 */
function getTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    labels.push(`${h}h00`);
    labels.push(`${h}h30`);
  }
  return labels;
}

const TIME_LABELS = getTimeLabels();

export interface CalendarGridProps {
  /** Date pivot (jour affiché ou début de semaine) */
  pivotDate: Date;
  /** Mode d'affichage: jour = 1 colonne, week = 7 colonnes */
  viewMode: ViewMode;
  /** Contenu à afficher dans chaque cellule "jour" (ex: les AppointmentCard). En clé: YYYY-MM-DD, en valeur: nœud React. */
  dayContent?: Record<string, React.ReactNode>;
  /** Clic sur un créneau vide: (date du jour, index du créneau 0..23). Story 3.3: ouvre la modal de création de RDV. */
  onSlotClick?: (date: Date, slotIndex: number) => void;
}

/** Export pour la page: nombre de créneaux (30 min) entre 8h et 20h */
export const CALENDAR_SLOT_COUNT = SLOT_COUNT;

/**
 * Calcule la liste des dates à afficher en colonnes.
 * - Vue jour: [pivotDate]
 * - Vue semaine: 7 jours à partir du lundi de la semaine de pivotDate
 */
function getDisplayDates(pivotDate: Date, viewMode: ViewMode): Date[] {
  if (viewMode === "day") {
    return [pivotDate];
  }
  const start = startOfWeek(pivotDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Hauteur d'un créneau en pixels (pour alignement vertical) */
const SLOT_HEIGHT_PX = 30;

/**
 * Calcule la date/heure de début du créneau pour un jour et un index de créneau.
 * slotIndex 0 = 8h00, 1 = 8h30, ..., 23 = 19h30.
 */
export function getSlotStartTime(date: Date, slotIndex: number): Date {
  const hour = HOUR_START + Math.floor(slotIndex / 2);
  const minute = (slotIndex % 2) * 30;
  return setMinutes(setHours(date, hour), minute);
}

export function CalendarGrid({
  pivotDate,
  viewMode,
  dayContent = {},
  onSlotClick,
}: CalendarGridProps) {
  const dates = getDisplayDates(pivotDate, viewMode);

  return (
    <div
      className="grid w-full overflow-auto rounded-md border border-border bg-background"
      style={{
        gridTemplateColumns: `auto ${viewMode === "day" ? "1fr" : "repeat(7, 1fr)"}`,
        gridTemplateRows: `repeat(${SLOT_COUNT}, ${SLOT_HEIGHT_PX}px)`,
      }}
    >
      {/* Colonne des heures (première colonne) */}
      {TIME_LABELS.map((label, i) => (
        <div
          key={label}
          className="flex items-start justify-end border-b border-border pr-2 pt-0.5 text-xs text-muted-foreground"
          style={{ gridColumn: 1, gridRow: i + 1 }}
        >
          {label}
        </div>
      ))}

      {/* Colonnes des jours (une colonne par date) */}
      {dates.map((date, dayIndex) => {
        const key = format(date, "yyyy-MM-dd");
        const content = dayContent[key] ?? null;
        return (
          <div
            key={key}
            className="relative flex flex-col border-l border-border first:border-l-0"
            style={{
              gridColumn: dayIndex + 2,
              gridRow: `1 / -1`,
            }}
          >
            {/* En-tête du jour (nom du jour + date) */}
            <div className="shrink-0 border-b border-border bg-muted/50 px-2 py-1.5 text-center text-xs font-medium text-foreground">
              {format(date, "EEE d", { locale: fr })}
            </div>
            {/* Zone des créneaux: hauteur fixe pour le calcul top%/height% des RDV */}
            <div
              className="relative flex-1 overflow-hidden"
              style={{
                height: SLOT_COUNT * SLOT_HEIGHT_PX,
              }}
            >
              {/* Lignes de séparation des créneaux */}
              {TIME_LABELS.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-b border-border"
                  style={{
                    top: `${(i / SLOT_COUNT) * 100}%`,
                    height: `${(1 / SLOT_COUNT) * 100}%`,
                  }}
                />
              ))}
              {/* Couche cliquable des créneaux vides (z-0, derrière le contenu) — Story 3.3 */}
              {onSlotClick &&
                TIME_LABELS.map((_, slotIndex) => (
                  <button
                    key={slotIndex}
                    type="button"
                    className="absolute left-0 right-0 z-0 cursor-pointer border-0 bg-transparent opacity-0 hover:opacity-100 hover:bg-primary/5 focus:opacity-100 focus:bg-primary/5 focus:outline-none"
                    style={{
                      top: `${(slotIndex / SLOT_COUNT) * 100}%`,
                      height: `${(1 / SLOT_COUNT) * 100}%`,
                    }}
                    aria-label={`Créer un rendez-vous à ${TIME_LABELS[slotIndex]} le ${format(date, "d MMMM", { locale: fr })}`}
                    onClick={() => onSlotClick(date, slotIndex)}
                  />
                ))}
              {/* Contenu du jour (AppointmentCard rendus par le parent, au-dessus des slots) */}
              <div className="absolute inset-0 z-10 px-0.5 pt-0.5">{content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
