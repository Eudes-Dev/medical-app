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
export const GRID_TOTAL_MINUTES = 12 * 60;

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
