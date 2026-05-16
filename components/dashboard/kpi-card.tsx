"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export type KpiTrend = "up" | "down" | "neutral";

export type KpiTone = "primary" | "success" | "violet" | "amber";

export interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  suffix?: string;
  icon: React.ReactNode;
  trend: KpiTrend;
  trendLabel: string;
  data: number[];
  tone?: KpiTone;
  delay?: number;
}

const toneStyles: Record<
  KpiTone,
  {
    iconBg: string;
    iconColor: string;
    stroke: string;
    gradientFrom: string;
    gradientTo: string;
    glow: string;
  }
> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    stroke: "oklch(0.6776 0.1481 238.1044)",
    gradientFrom: "oklch(0.6776 0.1481 238.1044 / 0.35)",
    gradientTo: "oklch(0.6776 0.1481 238.1044 / 0)",
    glow: "group-hover:shadow-primary/20",
  },
  success: {
    iconBg: "bg-secondary/15",
    iconColor: "text-secondary",
    stroke: "oklch(0.6505 0.1196 168.0107)",
    gradientFrom: "oklch(0.6505 0.1196 168.0107 / 0.35)",
    gradientTo: "oklch(0.6505 0.1196 168.0107 / 0)",
    glow: "group-hover:shadow-secondary/20",
  },
  violet: {
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500 dark:text-violet-400",
    stroke: "oklch(0.6056 0.2189 292.7172)",
    gradientFrom: "oklch(0.6056 0.2189 292.7172 / 0.35)",
    gradientTo: "oklch(0.6056 0.2189 292.7172 / 0)",
    glow: "group-hover:shadow-violet-500/20",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500 dark:text-amber-400",
    stroke: "oklch(0.7686 0.1647 70.0804)",
    gradientFrom: "oklch(0.7686 0.1647 70.0804 / 0.4)",
    gradientTo: "oklch(0.7686 0.1647 70.0804 / 0)",
    glow: "group-hover:shadow-amber-500/20",
  },
};

function TrendBadge({ trend, label }: { trend: KpiTrend; label: string }) {
  const config = {
    up: {
      Icon: ArrowUpRight,
      classes:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    },
    down: {
      Icon: ArrowDownRight,
      classes:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    },
    neutral: {
      Icon: Minus,
      classes:
        "bg-muted text-muted-foreground ring-border",
    },
  }[trend];

  const { Icon } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-all",
        config.classes,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}

export function KpiCard({
  title,
  value,
  unit,
  suffix,
  icon,
  trend,
  trendLabel,
  data,
  tone = "primary",
  delay = 0,
}: KpiCardProps) {
  const styles = toneStyles[tone];
  const gradientId = React.useId();

  const chartData = React.useMemo(
    () => data.map((v, i) => ({ i, v })),
    [data],
  );

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-xl hover:border-border",
        styles.glow,
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: styles.gradientFrom }}
      />

      {/* Header: icon + trend badge */}
      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 [&>svg]:size-5",
            styles.iconBg,
            styles.iconColor,
          )}
        >
          {icon}
        </div>
        <TrendBadge trend={trend} label={trendLabel} />
      </div>

      {/* Title */}
      <div className="relative mt-5">
        <p className="text-sm font-medium text-muted-foreground">
          {title}
          {suffix ? (
            <span className="ml-1 text-xs text-muted-foreground/70">
              {suffix}
            </span>
          ) : null}
        </p>
      </div>

      {/* Value */}
      <div className="relative mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {unit ? (
          <span className="text-xl font-semibold text-muted-foreground/60 tabular-nums">
            {unit}
          </span>
        ) : null}
      </div>

      {/* Sparkline */}
      <div className="relative mt-4 -mx-5 -mb-5 h-16 transition-transform duration-500 group-hover:scale-[1.02]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={styles.gradientFrom} />
                <stop offset="100%" stopColor={styles.gradientTo} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={styles.stroke}
              strokeWidth={2.25}
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
