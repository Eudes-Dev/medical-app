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

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppointmentStatus, AppointmentWithPatient } from "@/types";
import { getServiceColor } from "@/lib/cabinet/service-colors";
import {
  calculateTop,
  getDurationMinutes,
} from "./calendar-utils";
import { resolveDropTarget } from "./drag-utils";

/**
 * Seuil de mouvement (px) au-delà duquel un appui maintenu devient un drag.
 * En-deçà, le geste reste un clic qui ouvre le détail (story 8.2, AC 2).
 */
const DRAG_THRESHOLD_PX = 5;

/** Statuts dont la carte est déplaçable au pointeur (story 8.2, AC 1). */
const DRAGGABLE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

/** Égalité de deux cibles de dépôt (même jour + même créneau), pour ne pas
 * re-notifier le parent à chaque pixel parcouru. */
function sameTarget(
  a: { day: Date; slotIndex: number } | null,
  b: { day: Date; slotIndex: number } | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.slotIndex === b.slotIndex && a.day.getTime() === b.day.getTime();
}

export interface AppointmentCardProps {
  /** Rendez-vous avec infos patient */
  appointment: AppointmentWithPatient;
  /** Ouverture du drawer/détail au clic (optionnel, pour mobile) */
  onSelect?: (appointment: AppointmentWithPatient) => void;
  /**
   * Déplacement par glisser-déposer (story 8.2). Émis au relâchement sur un
   * créneau valide. Si absent, la carte n'est pas déplaçable (clic seul).
   */
  onMove?: (
    appointment: AppointmentWithPatient,
    day: Date,
    slotIndex: number,
  ) => void;
  /**
   * Notifie la cible de dépôt survolée pendant le drag (pour le surlignage du
   * créneau dans la grille), ou `null` quand il n'y a pas de cible / fin de drag.
   */
  onDropTargetChange?: (
    target: { day: Date; slotIndex: number } | null,
  ) => void;
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
export function AppointmentCard({
  appointment,
  onSelect,
  onMove,
  onDropTargetChange,
}: AppointmentCardProps) {
  const { patient, startTime, endTime, status, type, serviceColor } = appointment;
  const durationMinutes = getDurationMinutes(startTime, endTime);
  const top = calculateTop(startTime);
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.COMPLETED;
  const StatusIcon = styles.Icon;

  // --- Glisser-déposer (story 8.2) ---------------------------------------
  // Une carte n'est déplaçable que si un handler `onMove` est fourni ET que le
  // statut est actif (PENDING/CONFIRMED). Les RDV annulés/terminés restent un
  // simple bouton (clic → détail), curseur normal (AC 1).
  const isDraggable = !!onMove && DRAGGABLE_STATUSES.includes(status);

  /** État interne du geste pointeur (null = aucun appui en cours). */
  const gesture = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
    dragging: boolean;
    lastTarget: { day: Date; slotIndex: number } | null;
  } | null>(null);
  /** Translation visuelle de la carte tirée (null = au repos). */
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  /** Empêche le `onClick` d'ouverture juste après un drag (AC 2). */
  const suppressClick = useRef(false);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Bouton principal / toucher uniquement ; ignore clic droit & milieu.
    if (!isDraggable || e.button !== 0) return;
    suppressClick.current = false;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      dragging: false,
      lastTarget: null,
    };
    const el = e.currentTarget;
    if (typeof el.setPointerCapture === "function") {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* jsdom / navigateurs sans pointer capture : sans effet, non bloquant. */
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return; // sous le seuil → clic potentiel
      g.dragging = true;
    }
    setDrag({ dx, dy });
    // Surlignage du créneau cible : ne notifier que sur changement de cible.
    // On neutralise la carte tirée au hit-test pour viser la colonne survolée
    // et non sa colonne d'origine (drop inter-jours, AC 3).
    const target = resolveDropTarget(e.clientX, e.clientY, e.currentTarget);
    const next = target ? { day: target.day, slotIndex: target.slotIndex } : null;
    if (!sameTarget(g.lastTarget, next)) {
      g.lastTarget = next;
      onDropTargetChange?.(next);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (g) {
      const el = e.currentTarget;
      if (typeof el.releasePointerCapture === "function") {
        try {
          el.releasePointerCapture(g.pointerId);
        } catch {
          /* sans effet si la capture n'a pas été posée. */
        }
      }
    }
    setDrag(null);
    if (!g?.dragging) return; // simple clic : laisser onClick ouvrir le détail
    // Drag terminé : supprimer le clic d'ouverture et résoudre la cible.
    suppressClick.current = true;
    onDropTargetChange?.(null);
    const target = resolveDropTarget(e.clientX, e.clientY, e.currentTarget);
    // Hors zone → annulation (aucun onMove ; la carte revient à sa position).
    if (target) {
      onMove?.(appointment, target.day, target.slotIndex);
    }
  }

  function handlePointerCancel() {
    const g = gesture.current;
    gesture.current = null;
    setDrag(null);
    if (g?.dragging) onDropTargetChange?.(null);
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect?.(appointment);
  }
  // Accent secondaire (story 7.3) : pastille de couleur du service par-dessus le
  // fond de statut. Rendu uniquement si le RDV est rattaché à un service.
  const serviceDot = serviceColor ? getServiceColor(serviceColor).dot : null;

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
      onClick={handleClick}
      onPointerDown={isDraggable ? handlePointerDown : undefined}
      onPointerMove={isDraggable ? handlePointerMove : undefined}
      onPointerUp={isDraggable ? handlePointerUp : undefined}
      onPointerCancel={isDraggable ? handlePointerCancel : undefined}
      className={cn(
        // Positionnement absolu dans la colonne jour, avec 4px de respiration latérale
        "absolute inset-x-1 z-10 flex items-center gap-1.5 overflow-hidden rounded-md px-1.5 shadow-xs",
        // Transitions douces : ombre + léger lift au hover (passe au-dessus des voisines).
        // Désactivées pendant le drag pour un suivi 1:1 du pointeur (pas de lag).
        !drag && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:z-20",
        // Apparition douce
        "animate-in fade-in slide-in-from-left-1 duration-300",
        // Tokens de statut (fond + barre gauche + couleur de texte)
        styles.container,
        styles.text,
        // Curseur : saisissable au repos, « grabbing » pendant le drag (AC 1).
        isDraggable
          ? drag
            ? "cursor-grabbing"
            : "cursor-grab"
          : onSelect
            ? "cursor-pointer"
            : "cursor-default",
        // Carte « soulevée » pendant le drag : passe au-dessus des voisines,
        // ombre marquée + légère opacité (retour visuel, AC 1).
        drag && "z-50 scale-[1.02] opacity-90 shadow-lg ring-1 ring-primary/30"
      )}
      // Position par heure de début ; hauteur fixe pour uniformité visuelle.
      // Pendant le drag, on translate la carte pour suivre le pointeur ;
      // `touch-action: none` empêche le scroll tactile de voler le geste.
      style={{
        top,
        height: CARD_HEIGHT_PX,
        transform: drag ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
        touchAction: isDraggable ? "none" : undefined,
      }}
      aria-label={`Rendez-vous ${fullName} de ${timeRange}, ${durationLabel}, statut ${status}`}
      title={`${fullName} · ${timeRange} · ${type ?? ""}`.trim()}
    >
      {/* Pastille couleur du service (accent secondaire ; le statut reste dominant) */}
      {serviceDot && (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", serviceDot)}
          aria-hidden
        />
      )}

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
