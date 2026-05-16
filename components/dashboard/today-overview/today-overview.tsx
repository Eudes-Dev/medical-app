import { cn } from "@/lib/utils";

import { AlertsCard } from "./alerts-card";
import { ConsultationsCard } from "./consultations-card";

export interface TodayOverviewProps {
  className?: string;
}

/**
 * Section dashboard combinant les alertes du jour et la
 * timeline des prochaines consultations.
 * Layout : 1 colonne sur mobile, 2 colonnes (1/3 + 2/3) sur desktop.
 */
export function TodayOverview({ className }: TodayOverviewProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-3",
        className,
      )}
    >
      <AlertsCard className="lg:col-span-1" />
      <ConsultationsCard className="lg:col-span-2" />
    </div>
  );
}
