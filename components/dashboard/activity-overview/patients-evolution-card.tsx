"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { DEFAULT_PATIENTS_EVOLUTION } from "./data";
import type { PatientsEvolutionPoint, PatientsRange } from "./types";

const RANGE_TABS: { value: PatientsRange; label: string }[] = [
  { value: "30j", label: "30j" },
  { value: "90j", label: "90j" },
];

const CHART_CONFIG = {
  totalRdv: { label: "Total RDV", color: "var(--chart-1)" },
  nouveaux: { label: "Nouveaux", color: "var(--chart-2)" },
} satisfies ChartConfig;

interface PatientsEvolutionCardProps {
  data?: Record<PatientsRange, PatientsEvolutionPoint[]>;
  defaultRange?: PatientsRange;
  className?: string;
}

export function PatientsEvolutionCard({
  data = DEFAULT_PATIENTS_EVOLUTION,
  defaultRange = "30j",
  className,
}: PatientsEvolutionCardProps) {
  const [range, setRange] = React.useState<PatientsRange>(defaultRange);
  const series = data[range];

  return (
    <section
      aria-label="Évolution patients"
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-all duration-300 ease-out hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-2">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight">
            Évolution patients
          </h2>
          <p className="text-xs text-muted-foreground">
            Comparatif Nouveaux vs Consultations ({range})
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </header>

      <div className="relative flex-1 px-2 pb-2">
        <ChartContainer
          config={CHART_CONFIG}
          className="aspect-auto h-56 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={series}
            margin={{ top: 16, right: 16, left: 16, bottom: 4 }}
          >
            <defs>
              <linearGradient id="fill-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-totalRdv)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-totalRdv)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fill-new" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-nouveaux)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-nouveaux)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 6"
              stroke="var(--border)"
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={false}
              height={0}
            />
            <YAxis hide domain={[0, "dataMax + 4"]} />
            <ChartTooltip
              cursor={{
                stroke: "var(--color-totalRdv)",
                strokeOpacity: 0.3,
                strokeDasharray: "4 4",
              }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="border-border/60 shadow-lg"
                  labelKey="label"
                  labelClassName="text-xs font-medium"
                />
              }
            />
            <Area
              dataKey="totalRdv"
              name="Total RDV"
              type="monotone"
              stroke="var(--color-totalRdv)"
              strokeWidth={2.5}
              fill="url(#fill-total)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
            <Area
              dataKey="nouveaux"
              name="Nouveaux"
              type="monotone"
              stroke="var(--color-nouveaux)"
              strokeWidth={2.5}
              fill="url(#fill-new)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
}

function RangeTabs({
  value,
  onChange,
}: {
  value: PatientsRange;
  onChange: (value: PatientsRange) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Plage de temps"
      className="inline-flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium"
    >
      {RANGE_TABS.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors duration-200",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
