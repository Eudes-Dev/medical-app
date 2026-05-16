"use client";

import { cn } from "@/lib/utils";

import { KpiSparkline } from "./kpi-sparkline";
import { KPI_TONE_STYLES } from "./tone-styles";
import { TrendBadge } from "./trend-badge";
import type { KpiCardData } from "./types";

interface KpiCardProps {
  card: KpiCardData;
  /** Délai d'animation d'entrée en millisecondes. */
  delay?: number;
}

export function KpiCard({ card, delay = 0 }: KpiCardProps) {
  const styles = KPI_TONE_STYLES[card.tone];

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 pb-0 shadow-sm",
        "transition-all duration-300 ease-out will-change-transform",
        "hover:-translate-y-1 hover:border-border hover:shadow-xl",
        styles.hoverShadow,
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Halo décoratif au survol */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
          styles.glow,
        )}
      />

      {/* Header : icône + badge tendance */}
      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 [&>svg]:size-5",
            styles.iconBg,
            styles.iconColor,
          )}
        >
          {card.icon}
        </div>
        <TrendBadge
          trend={card.trend}
          label={card.trendLabel}
          isPositive={card.trendIsPositive}
        />
      </div>

      {/* Titre */}
      <div className="relative mt-5">
        <p className="text-sm font-medium text-muted-foreground">
          {card.title}
          {card.suffix ? (
            <span className="ml-1 text-xs text-muted-foreground/70">
              {card.suffix}
            </span>
          ) : null}
        </p>
      </div>

      {/* Valeur */}
      <div className="relative mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
          {card.value}
        </span>
        {card.unit ? (
          <span className="text-xl font-semibold text-muted-foreground/60 tabular-nums">
            {card.unit}
          </span>
        ) : null}
      </div>

      {/* Sparkline */}
      <div className="relative mt-4 -mx-5 transition-transform duration-500 ease-out group-hover:scale-[1.02]">
        <KpiSparkline
          id={card.id}
          label={card.title}
          color={styles.chartVar}
          data={card.data}
        />
      </div>
    </div>
  );
}
