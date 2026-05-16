import { cn } from "@/lib/utils";

import { DEFAULT_KPI_CARDS } from "./data";
import { KpiCard } from "./kpi-card";
import type { KpiCardData } from "./types";

/** Décalage en ms entre l'animation d'entrée de chaque carte. */
const STAGGER_DELAY_MS = 80;

export interface KpiCardsProps {
  cards?: KpiCardData[];
  className?: string;
}

/**
 * Grille responsive de cartes KPI pour le dashboard.
 * 1 colonne sur mobile, 2 sur tablette, 4 sur desktop.
 */
export function KpiCards({
  cards = DEFAULT_KPI_CARDS,
  className,
}: KpiCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {cards.map((card, index) => (
        <KpiCard key={card.id} card={card} delay={index * STAGGER_DELAY_MS} />
      ))}
    </div>
  );
}
