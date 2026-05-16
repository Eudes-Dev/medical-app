import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

import type { KpiTrend } from "./types";

interface TrendBadgeProps {
  trend: KpiTrend;
  label: string;
  /** L'évolution est-elle positive du point de vue métier ? */
  isPositive: boolean;
}

export function TrendBadge({ trend, label, isPositive }: TrendBadgeProps) {
  if (trend === "neutral") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
        <Minus className="size-3.5" strokeWidth={2.5} />
        {label}
      </span>
    );
  }

  const Icon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const tone = isPositive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
