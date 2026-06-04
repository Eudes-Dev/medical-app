"use client";

/**
 * Grille calendrier (Story 3.2 - Task 2).
 *
 * Refonte UI/UX :
 * - En-tête de jour enrichi : nom du jour, n° de jour mis en avant, badge de
 *   compteur de RDV, indicateur visuel "aujourd'hui" (souligné primary).
 * - Indicateur "SURCHARGÉ" : quand une colonne dépasse `OVERLOAD_THRESHOLD`,
 *   on affiche un badge rouge et un motif hachuré en arrière-plan pour signaler
 *   visuellement la saturation.
 * - État vide week-end : si une colonne est un samedi/dimanche sans RDV,
 *   on affiche un message convivial avec une icône café.
 * - Créneaux passés : grisés pour repérer rapidement la position dans la journée.
 * - Ligne "now" : trait horizontal animé qui matérialise l'heure courante
 *   sur la colonne d'aujourd'hui (subtil mais utile).
 *
 * @module components/calendar/CalendarGrid
 */

import {
  addDays,
  format,
  isSameDay,
  isWeekend,
  setHours,
  setMinutes,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Coffee } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dayKey as toDayKey,
  type TimeOffInterval,
} from "@/lib/cabinet/time-off";
import { toMinutes } from "@/lib/cabinet/working-hours";
import type { ViewMode } from "@/stores/useCalendarStore";
import {
  GRID_START_HOUR as HOUR_START,
  GRID_END_HOUR as HOUR_END,
  SLOT_COUNT,
  SLOT_HEIGHT_PX,
} from "./calendar-utils";
import { DAY_KEY_ATTR } from "./drag-utils";

/** Exception d'agenda à matérialiser sur la grille (story 7.2). */
export interface CalendarTimeOff extends TimeOffInterval {
  id: string;
  reason: string | null;
  source: "MANUAL" | "HOLIDAY";
}

/**
 * Géométrie de la grille (8h–20h, créneaux de 30 min). Source unique de vérité
 * dans `calendar-utils` (DRY, story 8.2) — réutilisée ici et dans `drag-utils`.
 */
/** Seuil au-delà duquel une journée est considérée comme "surchargée". */
const OVERLOAD_THRESHOLD = 12;

/**
 * Génère les libellés d'heures pour la colonne de gauche.
 * On affiche uniquement les heures pleines pour alléger l'oeil (les demi-heures
 * restent visibles via les lignes de séparation).
 */
function getTimeLabels(): { label: string; isHour: boolean }[] {
  const labels: { label: string; isHour: boolean }[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    labels.push({ label: `${String(h).padStart(2, "0")}:00`, isHour: true });
    labels.push({ label: "", isHour: false });
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
  /** Compteur de RDV par jour (clé: YYYY-MM-DD). Utilisé pour les badges et l'indicateur de surcharge. */
  dayCounts?: Record<string, number>;
  /** Clic sur un créneau vide: (date du jour, index du créneau 0..23). Story 3.3: ouvre la modal de création de RDV. */
  onSlotClick?: (date: Date, slotIndex: number) => void;
  /**
   * Exceptions d'agenda actives (story 7.2). Rendues en overlay informatif :
   * - `allDay` → bandeau plein sur toute la colonne du jour ;
   * - plage intra-journée → bandeau positionné sur la plage horaire concernée.
   * Le praticien reste autorisé à créer un RDV (overlay non-bloquant).
   */
  timeOffs?: CalendarTimeOff[];
  /**
   * Créneau cible mis en surbrillance pendant un glisser-déposer (story 8.2).
   * `dayKey` = colonne (YYYY-MM-DD), `slotIndex` = créneau 0..23. `null` au repos.
   */
  dropTarget?: { dayKey: string; slotIndex: number } | null;
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

/**
 * Calcule la date/heure de début du créneau pour un jour et un index de créneau.
 * slotIndex 0 = 8h00, 1 = 8h30, ..., 23 = 19h30.
 */
export function getSlotStartTime(date: Date, slotIndex: number): Date {
  const hour = HOUR_START + Math.floor(slotIndex / 2);
  const minute = (slotIndex % 2) * 30;
  return setMinutes(setHours(date, hour), minute);
}

/**
 * Position verticale en pixels de la ligne "maintenant" pour le jour donné,
 * ou null si on est en dehors de la plage 8h–20h.
 */
function getNowOffsetPx(date: Date): number | null {
  const now = new Date();
  if (!isSameDay(date, now)) return null;
  const minutesFromStart = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  const total = SLOT_COUNT * 30; // 24 créneaux * 30 min
  if (minutesFromStart < 0 || minutesFromStart > total) return null;
  return (minutesFromStart / 30) * SLOT_HEIGHT_PX;
}

/**
 * En-tête d'une colonne jour : nom du jour, n° de jour, badge compteur,
 * indicateur "aujourd'hui" et "surchargé".
 */
function DayHeader({
  date,
  count,
  overloaded,
}: {
  date: Date;
  count: number;
  overloaded: boolean;
}) {
  const isCurrentDay = isSameDay(date, new Date());
  // Nom court du jour (ex: "LUN", "MAR") + n° de jour (ex: "18")
  const dayName = format(date, "EEE", { locale: fr }).toUpperCase().replace(".", "");
  const dayNumber = format(date, "d");

  return (
    <div
      className={cn(
        "relative flex flex-col items-start gap-1 px-3 py-2.5 transition-colors",
        // Léger background tinté quand surchargé pour donner du contexte
        overloaded && "bg-rose-50/60 dark:bg-rose-950/20",
        // Surlignage de l'en-tête du jour courant
        isCurrentDay && !overloaded && "bg-primary/5"
      )}
    >
      {/* Ligne 1 : nom du jour + numéro + badge compteur à droite */}
      <div className="flex w-full items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[11px] font-semibold tracking-wider",
              isCurrentDay ? "text-primary" : "text-muted-foreground"
            )}
          >
            {dayName} {dayNumber}
          </span>
        </div>

        {/* Badge compteur RDV (visible uniquement si count > 0) */}
        {count > 0 && (
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
              overloaded
                ? "bg-rose-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
            aria-label={`${count} rendez-vous`}
          >
            {count}
          </span>
        )}
      </div>

      {/* Badge "SURCHARGÉ" : signale visuellement la saturation */}
      {overloaded && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700",
            "dark:bg-rose-950/40 dark:text-rose-300",
            "animate-in fade-in slide-in-from-top-1 duration-300"
          )}
        >
          {count} RDV · Surchargé
        </span>
      )}

      {/* Souligné fin sous l'en-tête du jour courant (accent visuel discret) */}
      {isCurrentDay && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
    </div>
  );
}

/**
 * État vide d'une colonne week-end sans RDV : invite au repos.
 * Affiché uniquement en vue semaine pour les samedis/dimanches sans RDV.
 */
function WeekendEmptyState() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center pointer-events-none">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground",
          "animate-in fade-in zoom-in-95 duration-500"
        )}
      >
        <Coffee className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground/80">Aucun rendez-vous</p>
      <p className="text-xs text-muted-foreground">Prenez du repos bien mérité.</p>
    </div>
  );
}

/**
 * Calcule les overlays d'exceptions pour un jour donné. Chaque overlay porte
 * une position verticale en pixels (relative à la zone des créneaux 8h–20h)
 * et un libellé court à afficher.
 */
function getTimeOffOverlays(
  date: Date,
  timeOffs: CalendarTimeOff[],
): { id: string; top: number; height: number; label: string; source: "MANUAL" | "HOLIDAY"; allDay: boolean }[] {
  const overlays: ReturnType<typeof getTimeOffOverlays> = [];
  const dKey = toDayKey(date);
  const gridMinutes = (HOUR_END - HOUR_START) * 60;
  const gridHeight = SLOT_COUNT * SLOT_HEIGHT_PX;

  for (const t of timeOffs) {
    const covers =
      toDayKey(t.startDate) <= dKey && dKey <= toDayKey(t.endDate);
    if (!covers) continue;

    const label =
      t.reason ?? (t.source === "HOLIDAY" ? "Jour férié" : "Congé");

    if (t.allDay) {
      overlays.push({
        id: t.id,
        top: 0,
        height: gridHeight,
        label,
        source: t.source,
        allDay: true,
      });
      continue;
    }
    if (!t.startTime || !t.endTime) continue;
    const startMin = Math.max(toMinutes(t.startTime) - HOUR_START * 60, 0);
    const endMin = Math.min(toMinutes(t.endTime) - HOUR_START * 60, gridMinutes);
    if (endMin <= 0 || startMin >= gridMinutes || endMin <= startMin) continue;
    overlays.push({
      id: t.id,
      top: (startMin / 30) * SLOT_HEIGHT_PX,
      height: ((endMin - startMin) / 30) * SLOT_HEIGHT_PX,
      label,
      source: t.source,
      allDay: false,
    });
  }
  return overlays;
}

export function CalendarGrid({
  pivotDate,
  viewMode,
  dayContent = {},
  dayCounts = {},
  onSlotClick,
  timeOffs = [],
  dropTarget = null,
}: CalendarGridProps) {
  const dates = getDisplayDates(pivotDate, viewMode);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "animate-in fade-in duration-300"
      )}
    >
      {/* ===== Bandeau d'en-têtes de jours (sticky pour rester visible au scroll) ===== */}
      <div
        className="sticky top-0 z-30 grid border-b border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80"
        style={{
          gridTemplateColumns: `64px ${viewMode === "day" ? "1fr" : "repeat(7, 1fr)"}`,
        }}
      >
        {/* Cellule vide en haut à gauche (alignée avec la colonne des heures) */}
        <div className="border-r border-border" aria-hidden />
        {dates.map((date, i) => {
          const key = format(date, "yyyy-MM-dd");
          const count = dayCounts[key] ?? 0;
          const overloaded = count >= OVERLOAD_THRESHOLD;
          return (
            <div
              key={key}
              className={cn(
                "border-r border-border last:border-r-0",
                // Petit décalage de fade-in d'une colonne à l'autre pour un effet "cascade"
                "animate-in fade-in slide-in-from-top-1"
              )}
              style={{ animationDelay: `${i * 40}ms`, animationDuration: "400ms" }}
            >
              <DayHeader date={date} count={count} overloaded={overloaded} />
            </div>
          );
        })}
      </div>

      {/* ===== Corps de la grille : colonne heures + colonnes jours ===== */}
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `64px ${viewMode === "day" ? "1fr" : "repeat(7, 1fr)"}`,
          gridTemplateRows: `repeat(${SLOT_COUNT}, ${SLOT_HEIGHT_PX}px)`,
        }}
      >
        {/* --- Colonne des heures (uniquement labels d'heures pleines) --- */}
        {TIME_LABELS.map((slot, i) => (
          <div
            key={`time-${i}`}
            className={cn(
              "flex items-start justify-end pr-2 pt-0.5 text-[10px] font-medium text-muted-foreground/70 tabular-nums",
              // Bordure plus marquée sur les heures pleines pour rythmer la grille
              slot.isHour ? "border-t border-border" : "",
              i === 0 && "border-t-0"
            )}
            style={{ gridColumn: 1, gridRow: i + 1 }}
          >
            {slot.label}
          </div>
        ))}

        {/* --- Colonnes des jours --- */}
        {dates.map((date, dayIndex) => {
          const key = format(date, "yyyy-MM-dd");
          const content = dayContent[key] ?? null;
          const count = dayCounts[key] ?? 0;
          const overloaded = count >= OVERLOAD_THRESHOLD;
          // Empty state week-end : uniquement en vue semaine, samedi/dimanche sans RDV
          const showWeekendEmpty =
            viewMode === "week" && isWeekend(date) && count === 0;
          const nowOffset = getNowOffsetPx(date);

          return (
            <div
              key={key}
              className={cn(
                "relative flex flex-col border-l border-border",
                // Motif hachuré sur les jours surchargés (visuel "trafic")
                overloaded && "calendar-overload-pattern"
              )}
              style={{
                gridColumn: dayIndex + 2,
                gridRow: `1 / -1`,
              }}
            >
              {/* Zone des créneaux : hauteur fixe = SLOT_COUNT * SLOT_HEIGHT_PX.
                  `data-day-key` permet au glisser-déposer (story 8.2) de retrouver
                  la colonne survolée et d'aligner `offsetY = clientY - rect.top`
                  sur l'index de créneau. */}
              <div
                className="relative flex-1 overflow-hidden"
                style={{ height: SLOT_COUNT * SLOT_HEIGHT_PX }}
                {...{ [DAY_KEY_ATTR]: key }}
              >
                {/* Surbrillance du créneau cible pendant un drag (story 8.2, AC 1).
                    Rendu sous les cartes (z-[5]) pour ne pas masquer le RDV tiré. */}
                {dropTarget?.dayKey === key && (
                  <div
                    className="pointer-events-none absolute left-0.5 right-0.5 z-[5] rounded-sm bg-primary/15 ring-2 ring-primary/40"
                    style={{
                      top: dropTarget.slotIndex * SLOT_HEIGHT_PX,
                      height: SLOT_HEIGHT_PX,
                    }}
                    aria-hidden
                  />
                )}

                {/* Lignes de séparation des créneaux (plus visibles aux heures pleines) */}
                {TIME_LABELS.map((slot, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute left-0 right-0 border-t",
                      slot.isHour ? "border-border" : "border-border/40"
                    )}
                    style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                  />
                ))}

                {/* Couche cliquable des créneaux vides — hover doux primary/5 */}
                {onSlotClick &&
                  TIME_LABELS.map((_, slotIndex) => (
                    <button
                      key={slotIndex}
                      type="button"
                      className={cn(
                        "absolute left-0 right-0 z-0 cursor-pointer border-0 bg-transparent transition-colors",
                        "hover:bg-primary/5 focus:bg-primary/10 focus:outline-none"
                      )}
                      style={{
                        top: slotIndex * SLOT_HEIGHT_PX,
                        height: SLOT_HEIGHT_PX,
                      }}
                      aria-label={`Créer un rendez-vous à ${String(HOUR_START + Math.floor(slotIndex / 2)).padStart(2, "0")}:${String((slotIndex % 2) * 30).padStart(2, "0")} le ${format(date, "d MMMM", { locale: fr })}`}
                      onClick={() => onSlotClick(date, slotIndex)}
                    />
                  ))}

                {/* Ligne "now" : trait horizontal rouge sur la colonne d'aujourd'hui */}
                {nowOffset !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{ top: nowOffset }}
                    aria-hidden
                  >
                    {/* Pastille à gauche (collée au bord) + trait fin sur toute la largeur.
                        On utilise left-0 plutôt que -left-1 pour éviter le clip
                        par le parent overflow-hidden. */}
                    <div className="relative">
                      <span className="absolute left-0 -top-[4px] h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40" />
                      <span className="block h-px w-full bg-rose-500/80" />
                    </div>
                  </div>
                )}

                {/* État vide week-end (au-dessus des slots, sans intercepter les clics) */}
                {showWeekendEmpty && <WeekendEmptyState />}

                {/* Overlays « Congé / Férié » (story 7.2, AC 3 — informatif, non bloquant).
                    `pointer-events-none` : le praticien reste autorisé à cliquer
                    le créneau sous-jacent pour créer un RDV malgré l'exception. */}
                {getTimeOffOverlays(date, timeOffs).map((o) => (
                  <div
                    key={o.id}
                    className={cn(
                      "pointer-events-none absolute left-0 right-0 z-[15] flex items-start justify-end gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                      // Hachure diagonale + couleur selon source.
                      o.source === "HOLIDAY"
                        ? "bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.18)_0,rgba(245,158,11,0.18)_6px,transparent_6px,transparent_12px)] text-amber-700"
                        : "bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.18)_0,rgba(244,63,94,0.18)_6px,transparent_6px,transparent_12px)] text-rose-700",
                    )}
                    style={{ top: o.top, height: o.height }}
                    aria-label={`${o.source === "HOLIDAY" ? "Jour férié" : "Congé"} : ${o.label}`}
                  >
                    <span className="rounded bg-white/80 px-1 shadow-sm">
                      {o.label}
                    </span>
                  </div>
                ))}

                {/* Contenu du jour (AppointmentCard rendus par le parent) */}
                <div className="absolute inset-0 z-10 px-1 pt-0.5">{content}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
