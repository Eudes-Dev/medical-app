import type { AlertTone, ConsultationStatus } from "./types";

interface AlertToneStyle {
  iconBg: string;
  iconColor: string;
  ring: string;
  hoverBg: string;
}

export const ALERT_TONE_STYLES: Record<AlertTone, AlertToneStyle> = {
  warning: {
    iconBg: "bg-amber-100 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
    hoverBg: "group-hover:bg-amber-50/60 dark:group-hover:bg-amber-500/5",
  },
  info: {
    iconBg: "bg-sky-100 dark:bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20",
    hoverBg: "group-hover:bg-sky-50/60 dark:group-hover:bg-sky-500/5",
  },
  danger: {
    iconBg: "bg-rose-100 dark:bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20",
    hoverBg: "group-hover:bg-rose-50/60 dark:group-hover:bg-rose-500/5",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    ring: "ring-primary/20",
    hoverBg: "group-hover:bg-primary/5",
  },
};

interface StatusStyle {
  dot: string;
  ping: string;
  badgeClass?: string;
  badgeLabel?: string;
}

export const CONSULTATION_STATUS_STYLES: Record<ConsultationStatus, StatusStyle> = {
  scheduled: {
    dot: "bg-slate-300 dark:bg-slate-600",
    ping: "",
  },
  live: {
    dot: "bg-primary",
    ping: "bg-primary/60",
  },
  confirmed: {
    dot: "bg-emerald-500",
    ping: "",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    badgeLabel: "Confirmé",
  },
  pending: {
    dot: "bg-amber-500",
    ping: "",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    badgeLabel: "À confirmer",
  },
};
