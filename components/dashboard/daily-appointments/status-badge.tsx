import { cn } from "@/lib/utils";

import { STATUS_STYLES } from "./status-styles";
import type { AppointmentStatus } from "./types";

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const isPulse = status === "ongoing";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.badgeClass,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {isPulse ? (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full motion-safe:animate-ping",
              style.dotClass,
              "opacity-60",
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex size-1.5 rounded-full", style.dotClass)} />
      </span>
      {style.label}
    </span>
  );
}
