"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { DEFAULT_TOP_TREATMENTS } from "./data";
import type { TopTreatment } from "./types";

const STAGGER_DELAY_MS = 90;

interface TopTreatmentsCardProps {
  treatments?: TopTreatment[];
  /** Période affichée dans le titre. */
  periodLabel?: string;
  className?: string;
}

export function TopTreatmentsCard({
  treatments = DEFAULT_TOP_TREATMENTS,
  periodLabel = "30j",
  className,
}: TopTreatmentsCardProps) {
  const max = React.useMemo(
    () => Math.max(...treatments.map((t) => t.count), 1),
    [treatments],
  );

  return (
    <section
      aria-label="Top soins"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-all duration-300 ease-out hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <h2 className="text-base font-semibold tracking-tight">
          Top Soins{" "}
          <span className="font-normal text-muted-foreground">
            ({periodLabel})
          </span>
        </h2>
      </header>

      <ul className="flex flex-col gap-4 px-5 py-4">
        {treatments.map((treatment, index) => {
          const ratio = treatment.count / max;
          const isLead = index === 0;
          return (
            <li
              key={treatment.id}
              className="group/item space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-500 motion-safe:fill-mode-both"
              style={{ animationDelay: `${index * STAGGER_DELAY_MS}ms` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover/item:text-primary">
                  {treatment.name}
                </p>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isLead ? "text-primary" : "text-foreground",
                  )}
                >
                  {treatment.count}
                </span>
              </div>
              <ProgressBar ratio={ratio} accent={isLead} delay={index * STAGGER_DELAY_MS} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface ProgressBarProps {
  ratio: number;
  accent?: boolean;
  delay: number;
}

function ProgressBar({ ratio, accent = false, delay }: ProgressBarProps) {
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out",
          accent
            ? "bg-gradient-to-r from-primary/80 to-primary"
            : "bg-muted-foreground/40",
        )}
        style={{
          width: `${percent}%`,
          transitionDelay: `${delay + 100}ms`,
        }}
      />
    </div>
  );
}
