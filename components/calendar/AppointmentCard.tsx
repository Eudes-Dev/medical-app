"use client";

/**
 * Carte d'un rendez-vous dans la grille calendrier (Story 3.2 - Task 4).
 *
 * Affiche:
 * - Nom du patient (prénom + nom)
 * - Heure de début et durée
 * - Couleur selon le statut: CONFIRMED = Emerald, PENDING = Amber, CANCELLED = Rose
 *
 * La hauteur et la position verticale (top) sont calculées en pourcentage
 * de la plage 8h–20h (12h = 720 min), pour s'aligner sur la grille.
 *
 * @module components/calendar/AppointmentCard
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AppointmentWithPatient } from "@/types";
import {
  calculateTop,
  calculateHeight,
  getDurationMinutes,
  getStatusBgClass,
} from "./calendar-utils";

export interface AppointmentCardProps {
  /** Rendez-vous avec infos patient */
  appointment: AppointmentWithPatient;
  /** Ouverture du drawer/détail au clic (optionnel, pour mobile) */
  onSelect?: (appointment: AppointmentWithPatient) => void;
}

/**
 * Carte compacte d'un rendez-vous, positionnée en absolu dans la colonne jour.
 */
export function AppointmentCard({ appointment, onSelect }: AppointmentCardProps) {
  const { patient, startTime, endTime, status } = appointment;
  const durationMinutes = getDurationMinutes(startTime, endTime);
  const top = calculateTop(startTime);
  const height = calculateHeight(durationMinutes);
  const bgClass = getStatusBgClass(status);

  const patientName = `${patient.firstName} ${patient.lastName}`.trim() || "Patient";
  const timeLabel = format(startTime, "HH:mm", { locale: fr });
  const durationLabel =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? `${durationMinutes % 60}min` : ""}`
      : `${durationMinutes} min`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(appointment)}
      className={`absolute left-0 right-0 z-10 overflow-hidden rounded border border-white/20 px-1.5 py-0.5 text-left text-xs shadow-sm transition-opacity hover:opacity-90 ${bgClass} ${onSelect ? "cursor-pointer" : "cursor-default"}`}
      style={{
        top,
        height,
        minHeight: "24px",
      }}
      aria-label={`Rendez-vous ${patientName} à ${timeLabel}, ${durationLabel}`}
    >
      <span className="block truncate font-medium">{patientName}</span>
      <span className="block truncate opacity-90">
        {timeLabel} · {durationLabel}
      </span>
    </button>
  );
}
