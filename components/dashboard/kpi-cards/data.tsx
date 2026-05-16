import { AlertCircle, CalendarCheck2, Gauge, UserPlus2 } from "lucide-react";

import type { KpiCardData } from "./types";

/**
 * Données par défaut affichées sur le dashboard.
 * À remplacer par des données dynamiques côté serveur.
 */
export const DEFAULT_KPI_CARDS: KpiCardData[] = [
  {
    id: "rdv-today",
    title: "RDV aujourd'hui",
    value: "18",
    unit: "/ 20",
    icon: <CalendarCheck2 />,
    tone: "primary",
    trend: "up",
    trendLabel: "+12%",
    trendIsPositive: true,
    data: [
      { label: "L", value: 10 },
      { label: "M", value: 12 },
      { label: "M", value: 9 },
      { label: "J", value: 14 },
      { label: "V", value: 13 },
      { label: "S", value: 16 },
      { label: "D", value: 18 },
    ],
  },
  {
    id: "new-patients",
    title: "Nouveaux patients",
    suffix: "(7j)",
    value: "12",
    icon: <UserPlus2 />,
    tone: "success",
    trend: "up",
    trendLabel: "+4",
    trendIsPositive: true,
    data: [
      { label: "S1", value: 4 },
      { label: "S2", value: 6 },
      { label: "S3", value: 5 },
      { label: "S4", value: 8 },
      { label: "S5", value: 7 },
      { label: "S6", value: 10 },
      { label: "S7", value: 12 },
    ],
  },
  {
    id: "fill-rate",
    title: "Taux de remplissage",
    value: "85",
    unit: "%",
    icon: <Gauge />,
    tone: "violet",
    trend: "neutral",
    trendLabel: "0%",
    trendIsPositive: true,
    data: [
      { label: "L", value: 82 },
      { label: "M", value: 84 },
      { label: "M", value: 83 },
      { label: "J", value: 85 },
      { label: "V", value: 86 },
      { label: "S", value: 84 },
      { label: "D", value: 85 },
    ],
  },
  {
    id: "no-shows",
    title: "No-shows",
    suffix: "(30j)",
    value: "2.4",
    unit: "%",
    icon: <AlertCircle />,
    tone: "amber",
    trend: "down",
    trendLabel: "-1%",
    trendIsPositive: true,
    data: [
      { label: "S1", value: 3.6 },
      { label: "S2", value: 3.4 },
      { label: "S3", value: 3.1 },
      { label: "S4", value: 2.9 },
      { label: "S5", value: 2.7 },
      { label: "S6", value: 2.5 },
      { label: "S7", value: 2.4 },
    ],
  },
];
