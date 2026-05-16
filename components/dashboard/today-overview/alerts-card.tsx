"use client";

import { Bell, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { DEFAULT_ALERTS } from "./data";
import { ALERT_TONE_STYLES } from "./tone-styles";
import type { AlertItem } from "./types";

const STAGGER_DELAY_MS = 80;

interface AlertsCardProps {
  alerts?: AlertItem[];
  className?: string;
}

export function AlertsCard({
  alerts = DEFAULT_ALERTS,
  className,
}: AlertsCardProps) {
  return (
    <section
      aria-label="Alertes et actions à traiter"
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-all duration-300 ease-out hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      {/* Bordure supérieure accent ambre */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80"
      />

      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 [&>svg]:size-4 motion-safe:animate-[wave_2.4s_ease-in-out_infinite] origin-bottom">
            <Bell />
          </span>
          <h2 className="text-base font-semibold tracking-tight">
            Alertes &amp; Actions
          </h2>
        </div>
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400">
          {alerts.length}
        </span>
      </header>

      <ul className="flex flex-col gap-1.5 px-3 pb-3">
        {alerts.map((alert, index) => (
          <AlertRow
            key={alert.id}
            alert={alert}
            delay={index * STAGGER_DELAY_MS}
          />
        ))}
      </ul>
    </section>
  );
}

interface AlertRowProps {
  alert: AlertItem;
  delay: number;
}

function AlertRow({ alert, delay }: AlertRowProps) {
  const styles = ALERT_TONE_STYLES[alert.tone];
  const Wrapper = alert.href ? "a" : "button";

  return (
    <li>
      <Wrapper
        {...(alert.href ? { href: alert.href } : { type: "button" as const })}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left",
          "transition-all duration-300 ease-out",
          "hover:translate-x-0.5",
          styles.hoverBg,
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-500 motion-safe:fill-mode-both",
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        <span
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 [&>svg]:size-4",
            styles.iconBg,
            styles.iconColor,
            styles.ring,
          )}
        >
          {alert.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {alert.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {alert.description}
          </p>
        </div>

        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:text-foreground"
        />
      </Wrapper>
    </li>
  );
}
