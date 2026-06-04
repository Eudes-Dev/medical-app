"use client";

/**
 * Utilitaires de glisser-déposer de l'agenda (Story 8.2).
 *
 * Ce module isole la logique « géométrie → créneau » :
 * - {@link pointToSlot} : fonction **pure** (testable hors DOM) qui convertit une
 *   position verticale en pixels en index de créneau (0..23) ou `null` hors zone.
 * - {@link isSameSlot}  : détecte le « no-op » (dépôt sur le créneau d'origine).
 * - {@link resolveDropTarget} : résout la colonne (jour) + le créneau survolés à
 *   partir des coordonnées pointeur (lit le DOM ; testé via mock de géométrie).
 *
 * On réutilise les constantes de géométrie de `calendar-utils` (DRY) plutôt que
 * de redéfinir `SLOT_HEIGHT_PX`/`SLOT_COUNT` en double.
 *
 * @module components/calendar/drag-utils
 */

import { isSameDay, parse } from "date-fns";

import {
  GRID_START_HOUR,
  SLOT_COUNT,
  SLOT_HEIGHT_PX,
} from "./calendar-utils";

/**
 * Attribut de données porté par la zone des créneaux de chaque colonne jour
 * (`CalendarGrid`). Sert à retrouver la colonne survolée au relâchement.
 */
export const DAY_KEY_ATTR = "data-day-key";

/**
 * Convertit une position Y (en pixels, **relative au haut de la zone des
 * créneaux**) en index de créneau de 30 min.
 *
 * @param offsetY - Décalage vertical depuis le haut de la zone des créneaux.
 * @returns L'index `0..SLOT_COUNT-1`, ou `null` si la position est hors de la
 *   zone (au-dessus de 8h ou au-delà de 20h) → le dépôt doit être annulé.
 */
export function pointToSlot(offsetY: number): number | null {
  if (!Number.isFinite(offsetY) || offsetY < 0) return null;
  const slot = Math.floor(offsetY / SLOT_HEIGHT_PX);
  if (slot < 0 || slot >= SLOT_COUNT) return null;
  return slot;
}

/**
 * Index de créneau correspondant à l'heure locale d'une date (symétrique de
 * `getSlotStartTime`). Utilisé pour comparer l'origine d'un RDV au créneau cible.
 */
export function timeToSlotIndex(date: Date): number {
  return (date.getHours() - GRID_START_HOUR) * 2 + Math.floor(date.getMinutes() / 30);
}

/**
 * Vrai si le créneau cible (jour + index) correspond exactement à l'origine du
 * RDV — auquel cas le dépôt est un **no-op** (aucune persistance, AC 4).
 *
 * @param origin - `startTime` actuel du RDV déplacé.
 * @param dayCible - Jour de la colonne de dépôt.
 * @param slotIndexCible - Index de créneau de dépôt (0..23).
 */
export function isSameSlot(
  origin: Date,
  dayCible: Date,
  slotIndexCible: number,
): boolean {
  if (!isSameDay(origin, dayCible)) return false;
  return timeToSlotIndex(origin) === slotIndexCible;
}

/** Cible de dépôt résolue depuis les coordonnées pointeur. */
export interface DropResolution {
  /** Date du jour de la colonne survolée (minuit local). */
  day: Date;
  /** Index de créneau (0..23) sous le pointeur. */
  slotIndex: number;
  /** Élément DOM de la zone des créneaux de la colonne (pour le surlignage). */
  column: HTMLElement;
}

/**
 * Résout la colonne (jour) et le créneau survolés à partir des coordonnées
 * pointeur, en lisant le DOM :
 * 1. `document.elementFromPoint` → plus proche ancêtre portant `data-day-key` ;
 * 2. `getBoundingClientRect` de cette colonne → `offsetY = clientY - rect.top` ;
 * 3. {@link pointToSlot} pour l'index de créneau (snap 30 min, borné 0..23).
 *
 * @param ignore - Élément à rendre transparent au hit-test (la carte tirée).
 *   Pendant le drag, la carte « soulevée » (z-50, translatée) reste sous le
 *   pointeur ; sans la neutraliser, `elementFromPoint` la renverrait elle-même
 *   et `closest` remonterait vers sa **colonne d'origine** au lieu de la colonne
 *   survolée → dépôt inter-jours (AC 3) cassé. On désactive donc temporairement
 *   ses `pointer-events` le temps du hit-test synchrone.
 *
 * @returns La cible, ou `null` si le pointeur est hors d'une colonne jour ou
 *   hors de la plage de créneaux (dépôt à annuler).
 */
export function resolveDropTarget(
  clientX: number,
  clientY: number,
  ignore?: HTMLElement | null,
): DropResolution | null {
  if (typeof document === "undefined") return null;
  const prevPointerEvents = ignore?.style.pointerEvents;
  if (ignore) ignore.style.pointerEvents = "none";
  let el: Element | null;
  try {
    el = document.elementFromPoint(clientX, clientY);
  } finally {
    if (ignore) ignore.style.pointerEvents = prevPointerEvents ?? "";
  }
  const column = el?.closest<HTMLElement>(`[${DAY_KEY_ATTR}]`) ?? null;
  if (!column) return null;
  const dayKey = column.getAttribute(DAY_KEY_ATTR);
  if (!dayKey) return null;
  const rect = column.getBoundingClientRect();
  const slotIndex = pointToSlot(clientY - rect.top);
  if (slotIndex === null) return null;
  // Parse en heure locale (minuit) — cohérent avec `getSlotStartTime` qui
  // applique ensuite setHours/setMinutes locaux. Évite le décalage UTC d'un
  // `new Date("yyyy-MM-dd")`.
  const day = parse(dayKey, "yyyy-MM-dd", new Date());
  return { day, slotIndex, column };
}
