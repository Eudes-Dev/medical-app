"use client";

/**
 * Carte d'un rendez-vous dans la grille calendrier (Story 3.2 - Task 4).
 *
 * Refonte UI/UX (v3) — uniformité visuelle :
 * - Toutes les cartes ont la même hauteur (CARD_HEIGHT_PX) quel que soit la
 *   durée du RDV. C'est un choix volontaire pour avoir un agenda "lisse" :
 *   les cartes sont des pastilles uniformes, comme dans la maquette de
 *   référence. La durée reste accessible via l'aria-label et le tooltip.
 * - Layout unique : une seule ligne `HH:mm · Nom Patient · ✓` avec icône de
 *   statut alignée à droite.
 * - Positionnement vertical : par l'heure de début (calculateTop), comme avant.
 *
 * @module components/calendar/AppointmentCard
 */

import { format } from "date-fns";
import { Check, CheckCheck, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppointmentStatus, AppointmentWithPatient } from "@/types";
import {
  calculateTop,
  getDurationMinutes,
} from "./calendar-utils";

export interface AppointmentCardProps {
  /** Rendez-vous avec infos patient */
  appointment: AppointmentWithPatient;
  /** Ouverture du drawer/détail au clic (optionnel, pour mobile) */
  onSelect?: (appointment: AppointmentWithPatient) => void;
}

/**
 * Hauteur fixe d'une carte de RDV en pixels.
 * 28px = une seule ligne confortable (time + nom + icône).
 *
 * Doit rester ≤ SLOT_HEIGHT_PX (30px) défini dans CalendarGrid pour qu'une
 * carte tienne dans un créneau de 30 min sans déborder.
 */
const CARD_HEIGHT_PX = 28;

/**
 * Tokens visuels par statut.
 *
 * - `container` : fond + bordure gauche colorée (signal de statut)
 * - `text`      : couleur de texte principal
 * - `Icon`      : icône de statut affichée en haut à droite
 * - `iconColor` : couleur de l'icône (associée à la palette)
 */
const STATUS_STYLES: Record<
  AppointmentStatus,
  {
    container: string;
    text: string;
    Icon: typeof Check;
    iconColor: string;
  }
> = {
  CONFIRMED: {
    container:
      "bg-emerald-50 border-l-[3px] border-l-emerald-500 dark:bg-emerald-950/30 dark:border-l-emerald-400",
    text: "text-emerald-950 dark:text-emerald-100",
    Icon: Check,
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  PENDING: {
    container:
      "bg-amber-50 border-l-[3px] border-l-amber-500 dark:bg-amber-950/30 dark:border-l-amber-400",
    text: "text-amber-950 dark:text-amber-100",
    Icon: Clock,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  CANCELLED: {
    container:
      "bg-rose-50 border-l-[3px] border-l-rose-500 line-through opacity-70 dark:bg-rose-950/30 dark:border-l-rose-400",
    text: "text-rose-950 dark:text-rose-100",
    Icon: XCircle,
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  COMPLETED: {
    container:
      "bg-slate-100 border-l-[3px] border-l-slate-400 opacity-85 dark:bg-slate-900/40 dark:border-l-slate-500",
    text: "text-slate-800 dark:text-slate-200",
    Icon: CheckCheck,
    iconColor: "text-slate-500 dark:text-slate-400",
  },
};

/**
 * Carte uniforme d'un rendez-vous, positionnée en absolu dans la colonne jour.
 * Hauteur fixe = CARD_HEIGHT_PX. Position verticale = heure de début.
 */
export function AppointmentCard({ appointment, onSelect }: AppointmentCardProps) {
  const { patient, startTime, endTime, status, type } = appointment;
  const durationMinutes = getDurationMinutes(startTime, endTime);
  const top = calculateTop(startTime);
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.COMPLETED;
  const StatusIcon = styles.Icon;

  // Nom complet du patient (avec fallback si données manquantes)
  const fullName = `${patient.firstName} ${patient.lastName}`.trim() || "Patient";

  // Initiale au lieu du nom complet : économise la place en colonne étroite (vue semaine)
  const shortName =
    patient.firstName && patient.lastName
      ? `${patient.firstName} ${patient.lastName[0]}.`
      : fullName;

  const startLabel = format(startTime, "HH:mm");
  const endLabel = format(endTime, "HH:mm");
  const timeRange = `${startLabel} - ${endLabel}`;

  // Label durée pour aria/tooltip (la donnée n'est plus visuelle, on la rend accessible)
  const durationLabel =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? `${durationMinutes % 60}min` : ""}`
      : `${durationMinutes} min`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(appointment)}
      className={cn(
        // Positionnement absolu dans la colonne jour, avec 4px de respiration latérale
        "absolute inset-x-1 z-10 flex items-center gap-1.5 overflow-hidden rounded-md px-1.5 shadow-xs",
        // Transitions douces : ombre + léger lift au hover (passe au-dessus des voisines)
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:z-20",
        // Apparition douce
        "animate-in fade-in slide-in-from-left-1 duration-300",
        // Tokens de statut (fond + barre gauche + couleur de texte)
        styles.container,
        styles.text,
        // Curseur selon l'interactivité
        onSelect ? "cursor-pointer" : "cursor-default"
      )}
      // Position par heure de début ; hauteur fixe pour uniformité visuelle.
      style={{ top, height: CARD_HEIGHT_PX }}
      aria-label={`Rendez-vous ${fullName} de ${timeRange}, ${durationLabel}, statut ${status}`}
      title={`${fullName} · ${timeRange} · ${type ?? ""}`.trim()}
    >
      {/* Heure de début, en gras et tabulaire (pour alignement vertical des cartes) */}
      <span className="shrink-0 text-[10px] font-bold tabular-nums opacity-80">
        {startLabel}
      </span>

      {/* Nom patient (compact) — flex-1 + truncate pour s'adapter à la largeur de colonne */}
      <span className="flex-1 truncate text-[11px] font-medium leading-none">
        {shortName}
      </span>

      {/* Icône de statut (alignée à droite) */}
      <StatusIcon
        className={cn("h-3 w-3 shrink-0", styles.iconColor)}
        aria-hidden
      />
    </button>
  );
}
