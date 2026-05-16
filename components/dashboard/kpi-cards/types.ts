import type * as React from "react";

export type KpiTone = "primary" | "success" | "violet" | "amber";

export type KpiTrend = "up" | "down" | "neutral";

export interface KpiSparklinePoint {
  label: string;
  value: number;
}

export interface KpiCardData {
  id: string;
  title: string;
  suffix?: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  tone: KpiTone;
  trend: KpiTrend;
  trendLabel: string;
  /** L'évolution est-elle positive du point de vue métier ? */
  trendIsPositive: boolean;
  data: KpiSparklinePoint[];
}

export interface KpiToneStyle {
  iconBg: string;
  iconColor: string;
  chartVar: string;
  hoverShadow: string;
  glow: string;
}
