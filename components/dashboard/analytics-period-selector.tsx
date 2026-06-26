"use client";

/**
 * Sélecteur de période des statistiques (story 10.1).
 *
 * Petit composant client : pousse `?period=…` dans l'URL via `router.replace`
 * (le calcul des indicateurs reste **serveur**, déclenché par le re-render du
 * Server Component parent). Aucune logique métier ici.
 *
 * @module components/dashboard/analytics-period-selector
 */

import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { STATS_PERIODS, type StatsPeriod } from "@/lib/analytics/stats";

export interface AnalyticsPeriodSelectorProps {
  current: StatsPeriod;
}

export function AnalyticsPeriodSelector({
  current,
}: AnalyticsPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label="Période des statistiques"
      className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
    >
      {STATS_PERIODS.map((option) => {
        const isActive = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() =>
              router.replace(`${pathname}?period=${option.value}`)
            }
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
