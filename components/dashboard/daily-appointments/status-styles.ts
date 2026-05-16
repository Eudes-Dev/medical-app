import type { AppointmentStatus } from "./types";

interface StatusStyle {
  label: string;
  dotClass: string;
  badgeClass: string;
}

export const STATUS_STYLES: Record<AppointmentStatus, StatusStyle> = {
  completed: {
    label: "Terminé",
    dotClass: "bg-slate-400",
    badgeClass:
      "bg-slate-100 text-slate-600 ring-slate-300/40 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20",
  },
  ongoing: {
    label: "En cours",
    dotClass: "bg-primary",
    badgeClass:
      "bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-primary",
  },
  confirmed: {
    label: "Confirmé",
    dotClass: "bg-emerald-500",
    badgeClass:
      "bg-emerald-100 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  pending: {
    label: "En attente",
    dotClass: "bg-amber-500",
    badgeClass:
      "bg-amber-100 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400",
  },
  cancelled: {
    label: "Annulé",
    dotClass: "bg-rose-500",
    badgeClass:
      "bg-rose-100 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400",
  },
};
