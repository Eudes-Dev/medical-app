/**
 * Utilitaires de calcul pour le calendrier (Story 3.2).
 *
 * - Position verticale (top) et hauteur des RDV dans la plage 8h–20h
 * - Durée en minutes entre startTime et endTime
 * - Couleurs d’affichage selon le statut du RDV
 *
 * @module components/calendar/calendar-utils
 */

import type { AppointmentStatus } from "@/types";

/** Plage horaire de la grille : 8h à 20h = 12h = 720 minutes */
export const GRID_START_HOUR = 8;
/** Heure de fin de la grille (exclusive pour les créneaux). */
export const GRID_END_HOUR = 20;
export const GRID_TOTAL_MINUTES = 12 * 60;

/**
 * Géométrie de la grille — source unique de vérité (story 8.2, DRY).
 *
 * Ces constantes étaient auparavant redéfinies en privé dans `CalendarGrid` et
 * doivent rester partagées avec `drag-utils` (mapping position → créneau) pour
 * éviter des « nombres magiques » divergents.
 *
 * - `SLOT_DURATION_MIN` : durée d'un créneau (30 min).
 * - `SLOT_COUNT`        : nombre de créneaux entre 8h et 20h (= 24).
 * - `SLOT_HEIGHT_PX`    : hauteur d'un créneau en pixels (= 30). La zone des
 *   créneaux d'une colonne jour mesure donc `SLOT_COUNT * SLOT_HEIGHT_PX` px.
 */
export const SLOT_DURATION_MIN = 30;
export const SLOT_COUNT = (GRID_END_HOUR - GRID_START_HOUR) * 2;
export const SLOT_HEIGHT_PX = 30;

/**
 * Seuil au-delà duquel une journée est considérée comme « surchargée » et mise
 * en évidence (teinte `rose` + badge). Source unique de vérité (DRY, story 8.3)
 * partagée par la vue jour/semaine (`CalendarGrid`) et la vue mois (`MonthGrid`).
 */
export const OVERLOAD_THRESHOLD = 12;

/**
 * Couleurs des statuts pour le calendrier (Story 3.2 Dev Notes).
 * - CONFIRMED: Emerald-500 | PENDING: Amber-500 | CANCELLED: Rose-500 | COMPLETED: gris
 */
export const STATUS_BG_COLORS: Record<AppointmentStatus, string> = {
  CONFIRMED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  CANCELLED: "bg-rose-500 text-white",
  COMPLETED: "bg-gray-500 text-white",
};

/** Retourne la classe Tailwind pour le fond selon le statut. */
export function getStatusBgClass(status: AppointmentStatus): string {
  return STATUS_BG_COLORS[status] ?? "bg-gray-500 text-white";
}

/**
 * Calcule la position verticale (top) en pourcentage.
 * 8h = 0%, 20h = 100%.
 *
 * @param dateTime - Date/heure de début du RDV
 * @returns Pourcentage (ex: "12.5")
 */
export function calculateTop(dateTime: Date): string {
  const hours = dateTime.getHours();
  const minutes = dateTime.getMinutes();
  const totalMinutes = (hours - GRID_START_HOUR) * 60 + minutes;
  const percentage = (totalMinutes / GRID_TOTAL_MINUTES) * 100;
  return `${Math.max(0, Math.min(100, percentage))}%`;
}

/**
 * Calcule la hauteur en pourcentage selon la durée en minutes.
 *
 * @param durationMinutes - Durée du RDV en minutes
 * @returns Pourcentage (ex: "4.17" pour 30 min)
 */
export function calculateHeight(durationMinutes: number): string {
  const percentage = (durationMinutes / GRID_TOTAL_MINUTES) * 100;
  return `${Math.min(100, percentage)}%`;
}

/**
 * Retourne la durée en minutes entre startTime et endTime.
 */
export function getDurationMinutes(startTime: Date, endTime: Date): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
}
