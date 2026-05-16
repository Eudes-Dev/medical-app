"use client";

import * as React from "react";
import { CalendarDays, MoreVertical, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { DEFAULT_CONSULTATIONS } from "./data";
import { CONSULTATION_STATUS_STYLES } from "./tone-styles";
import type { Consultation, ConsultationRange } from "./types";

const RANGE_TABS: { value: ConsultationRange; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "tomorrow", label: "Demain" },
  { value: "week", label: "Cette semaine" },
];

const STAGGER_DELAY_MS = 70;

interface ConsultationsCardProps {
  data?: Record<ConsultationRange, Consultation[]>;
  defaultRange?: ConsultationRange;
  className?: string;
}

export function ConsultationsCard({
  data = DEFAULT_CONSULTATIONS,
  defaultRange = "today",
  className,
}: ConsultationsCardProps) {
  const [range, setRange] = React.useState<ConsultationRange>(defaultRange);
  const consultations = data[range];

  return (
    <section
      aria-label="Prochaines consultations"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-all duration-300 ease-out hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:size-4">
            <CalendarDays />
          </span>
          <h2 className="text-base font-semibold tracking-tight">
            Prochaines consultations
          </h2>
        </div>

        <RangeTabs value={range} onChange={setRange} />
      </header>

      <div className="relative px-3 pb-3">
        {consultations.length === 0 ? (
          <EmptyState />
        ) : (
          <ol className="relative flex flex-col">
            {/* Ligne verticale de la timeline */}
            <span
              aria-hidden
              className="absolute left-[4.25rem] top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-border to-transparent"
            />
            {consultations.map((consultation, index) => (
              <ConsultationRow
                key={consultation.id}
                consultation={consultation}
                delay={index * STAGGER_DELAY_MS}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

interface RangeTabsProps {
  value: ConsultationRange;
  onChange: (value: ConsultationRange) => void;
}

function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Plage de temps"
      className="relative inline-flex items-center rounded-lg bg-muted p-0.5 text-xs font-medium"
    >
      {RANGE_TABS.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative z-10 rounded-md px-3 py-1.5 transition-colors duration-200",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface ConsultationRowProps {
  consultation: Consultation;
  delay: number;
}

function ConsultationRow({ consultation, delay }: ConsultationRowProps) {
  const statusStyle = CONSULTATION_STATUS_STYLES[consultation.status];
  const isLive = consultation.status === "live";
  const isPending = consultation.status === "pending";
  const initials = getInitials(consultation.patientName);

  return (
    <li
      className={cn(
        "group/row relative grid grid-cols-[3.5rem_1.25rem_1fr] items-center gap-3 rounded-xl px-2 py-2.5 transition-all duration-300 ease-out",
        "hover:bg-accent/40",
        isLive &&
          "bg-primary/5 ring-1 ring-primary/20 hover:bg-primary/10",
        isPending && "ring-1 ring-dashed ring-amber-400/40",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Colonne heure */}
      <div
        className={cn(
          "text-sm font-semibold tabular-nums",
          isLive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {consultation.time}
      </div>

      {/* Colonne dot timeline */}
      <div className="relative flex items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "relative flex size-2.5 rounded-full ring-4 ring-card",
            statusStyle.dot,
          )}
        >
          {isLive ? (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full motion-safe:animate-ping",
                statusStyle.ping,
              )}
            />
          ) : null}
        </span>
      </div>

      {/* Colonne contenu */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="ring-2 ring-card transition-transform duration-300 ease-out group-hover/row:scale-105">
          {consultation.avatarUrl ? (
            <AvatarImage src={consultation.avatarUrl} alt={consultation.patientName} />
          ) : null}
          <AvatarFallback
            className={cn(
              "text-xs font-semibold",
              isLive && "bg-primary/15 text-primary",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {consultation.patientName}
          </p>
          <p
            className={cn(
              "flex items-center gap-1.5 truncate text-xs",
              isLive
                ? "font-medium text-primary"
                : "text-muted-foreground",
            )}
          >
            {consultation.kind === "teleconsultation" ? (
              <Video aria-hidden className="size-3.5 shrink-0" />
            ) : null}
            <span className="truncate">{consultation.reason}</span>
          </p>
        </div>

        <ConsultationActions consultation={consultation} />
      </div>
    </li>
  );
}

function ConsultationActions({ consultation }: { consultation: Consultation }) {
  const statusStyle = CONSULTATION_STATUS_STYLES[consultation.status];

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {consultation.status === "live" ? (
        <Button
          size="sm"
          className="shadow-sm shadow-primary/30 transition-transform hover:-translate-y-0.5"
        >
          Rejoindre
        </Button>
      ) : consultation.status === "pending" ? (
        <Button
          size="sm"
          variant="secondary"
          className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
        >
          Valider
        </Button>
      ) : statusStyle.badgeLabel ? (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            statusStyle.badgeClass,
          )}
        >
          {statusStyle.badgeLabel}
        </span>
      ) : null}

      <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
        {consultation.durationMin} min
      </span>

      <button
        type="button"
        aria-label="Plus d'options"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all duration-200 hover:bg-muted hover:text-foreground group-hover/row:opacity-100"
      >
        <MoreVertical className="size-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-5">
        <CalendarDays />
      </span>
      <p className="text-sm font-medium text-foreground">Aucune consultation</p>
      <p className="text-xs text-muted-foreground">
        Votre agenda est libre sur cette plage.
      </p>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
