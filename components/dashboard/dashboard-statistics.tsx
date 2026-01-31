import React from "react";
import { Button } from "../ui/button";
import { Ellipsis } from "lucide-react";
import { MdOutlineTrendingUp } from "react-icons/md";
import { DashboardStatisticsChart } from "./dashboard-satistic-chart";

interface Props {
  title: string;
  count: number;
  difPercent: number;
  dif: string;
}

const DashboardStatistics = ({ title, count, difPercent, dif }: Props) => {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 shadow-lg p-4 sm:p-5 rounded-lg border border-border min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2 className="text-lg sm:text-xl font-semibold truncate">{title}</h2>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 size-8 sm:size-9"
        >
          <Ellipsis size={16} strokeWidth={2} />
        </Button>
      </div>
      {/* Count, différence et chart */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex shrink-0 flex-col items-start gap-3 min-w-0">
          <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums truncate">
            {count}
          </span>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-0.5 text-sm sm:text-base md:text-lg shrink-0">
              <MdOutlineTrendingUp className="size-4 sm:size-5" />
              <span>{difPercent} %</span>
            </span>
            {dif ? (
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground truncate max-w-full">
                {dif}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 basis-0 sm:min-w-[140px]">
          <DashboardStatisticsChart />
        </div>
      </div>
    </div>
  );
};

export default DashboardStatistics;
