"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "An area chart with gradient fill"

const chartData = [
  {  desktop: 186 },
  {  desktop: 305 },
  {  desktop: 237 },
  {  desktop: 73 },
  {  desktop: 209 },
  {  desktop: 214 },
]

const chartConfig = {
  desktop: {
    label: "Valeur",
    color: "var(--chart-1)",
  },
  label: {
    label: "Période",
  },
} satisfies ChartConfig

export function DashboardStatisticsChart() {
  return (
    <Card className="w-full min-w-0 max-w-full border-none bg-transparent p-0 shadow-none">
      <CardContent className="min-w-0 overflow-hidden p-0">
        <ChartContainer
          config={chartConfig}
          className="h-16 w-full min-w-0 max-w-full sm:h-20"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="2 2" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
