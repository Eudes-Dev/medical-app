import type { KpiTone, KpiToneStyle } from "./types";

export const KPI_TONE_STYLES: Record<KpiTone, KpiToneStyle> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    chartVar: "var(--primary)",
    hoverShadow: "hover:shadow-primary/15",
    glow: "from-primary/15",
  },
  success: {
    iconBg: "bg-secondary/15",
    iconColor: "text-secondary",
    chartVar: "var(--secondary)",
    hoverShadow: "hover:shadow-secondary/15",
    glow: "from-secondary/15",
  },
  violet: {
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500 dark:text-violet-400",
    chartVar: "oklch(0.6056 0.2189 292.7172)",
    hoverShadow: "hover:shadow-violet-500/15",
    glow: "from-violet-500/15",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500 dark:text-amber-400",
    chartVar: "oklch(0.7686 0.1647 70.0804)",
    hoverShadow: "hover:shadow-amber-500/15",
    glow: "from-amber-500/15",
  },
};
