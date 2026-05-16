"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import type { KpiSparklinePoint } from "./types";

interface KpiSparklineProps {
  id: string;
  label: string;
  color: string;
  data: KpiSparklinePoint[];
}

/**
 * Sparkline en Area Chart avec dégradé (pattern shadcn/ui).
 * Le dégradé va de 45% d'opacité en haut à 0% en bas.
 */
export function KpiSparkline({ id, label, color, data }: KpiSparklineProps) {
  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      value: { label, color },
    }),
    [label, color],
  );

  const gradientId = `fill-${id}`;

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-20 w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-value)"
              stopOpacity={0.45}
            />
            <stop
              offset="95%"
              stopColor="var(--color-value)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="transparent" />
        <XAxis dataKey="label" hide />
        <ChartTooltip
          cursor={{
            stroke: "var(--color-value)",
            strokeOpacity: 0.3,
            strokeDasharray: "4 4",
          }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelClassName="text-xs"
              className="border-border/60"
            />
          }
        />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  );
}
