import { cn } from "@/lib/utils";

import { ActivityCalendarCard } from "./activity-calendar-card";
import { PatientsEvolutionCard } from "./patients-evolution-card";
import { TopTreatmentsCard } from "./top-treatments-card";

export interface ActivityOverviewProps {
  className?: string;
}

/**
 * Section dashboard combinant :
 * - l'évolution patients (chart),
 * - le top des soins (progress list),
 * - l'activité mensuelle (heatmap calendaire).
 */
export function ActivityOverview({ className }: ActivityOverviewProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7",
        className,
      )}
    >
      <PatientsEvolutionCard className="md:col-span-2 xl:col-span-3" />
      <TopTreatmentsCard className="xl:col-span-2" />
      <ActivityCalendarCard className="xl:col-span-2" />
    </div>
  );
}
