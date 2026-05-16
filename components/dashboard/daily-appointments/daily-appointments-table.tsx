"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { DEFAULT_DAILY_APPOINTMENTS, DEFAULT_DAILY_TOTAL } from "./data";
import { StatusBadge } from "./status-badge";
import type { DailyAppointment } from "./types";

const STAGGER_DELAY_MS = 60;

export interface DailyAppointmentsTableProps {
  appointments?: DailyAppointment[];
  /** Total de RDV (toutes pages confondues). */
  total?: number;
  /** Numéro de page courant (1-indexé). */
  page?: number;
  className?: string;
}

export function DailyAppointmentsTable({
  appointments = DEFAULT_DAILY_APPOINTMENTS,
  total = DEFAULT_DAILY_TOTAL,
  page = 1,
  className,
}: DailyAppointmentsTableProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        a.patientEmail.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }, [appointments, query]);

  const rangeStart = filtered.length === 0 ? 0 : 1;
  const rangeEnd = filtered.length;

  return (
    <section
      aria-label="Liste des rendez-vous du jour"
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "transition-all duration-300 ease-out hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold tracking-tight">
          Tous les RDV du jour
        </h2>
        <div className="relative w-full max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un patient..."
            className="h-10 rounded-full bg-muted/50 pl-9 shadow-none focus-visible:bg-card"
            aria-label="Rechercher un patient"
          />
        </div>
      </header>

      <div className="relative w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted/40">
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Th className="pl-5">Heure</Th>
              <Th>Patient</Th>
              <Th>Type de consultation</Th>
              <Th>Durée</Th>
              <Th>Statut</Th>
              <Th className="pr-5 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Aucun rendez-vous ne correspond à votre recherche.
                </td>
              </tr>
            ) : (
              filtered.map((appointment, index) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  delay={index * STAGGER_DELAY_MS}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Footer
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        page={page}
      />
    </section>
  );
}

function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th className={cn("h-11 px-4 text-left align-middle", className)}>{children}</th>
  );
}

interface AppointmentRowProps {
  appointment: DailyAppointment;
  delay: number;
}

function AppointmentRow({ appointment, delay }: AppointmentRowProps) {
  const isLive = appointment.status === "ongoing";
  const initials = getInitials(appointment.patientName);

  return (
    <tr
      className={cn(
        "group/row relative border-t border-border/60 transition-colors duration-200",
        "hover:bg-muted/40",
        isLive && "bg-primary/[0.04]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1 motion-safe:duration-500 motion-safe:fill-mode-both",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="relative px-4 py-4 pl-5">
        {isLive ? (
          <span
            aria-hidden
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
          />
        ) : null}
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            isLive ? "text-primary" : "text-foreground",
          )}
        >
          {appointment.time}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="ring-2 ring-card transition-transform duration-300 ease-out group-hover/row:scale-105">
            {appointment.patientAvatarUrl ? (
              <AvatarImage
                src={appointment.patientAvatarUrl}
                alt={appointment.patientName}
              />
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {appointment.patientName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {appointment.patientEmail}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/90">
          {appointment.isTeleconsultation ? (
            <Video aria-hidden className="size-3.5 text-primary" />
          ) : null}
          {appointment.type}
        </span>
      </td>

      <td className="px-4 py-4 text-sm tabular-nums text-muted-foreground">
        {appointment.durationMin} min
      </td>

      <td className="px-4 py-4">
        <StatusBadge status={appointment.status} />
      </td>

      <td className="px-4 py-4 pr-5 text-right">
        {isLive ? (
          <Button
            size="sm"
            className="shadow-sm shadow-primary/30 transition-transform hover:-translate-y-0.5"
          >
            Rejoindre
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

interface FooterProps {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  page: number;
}

function Footer({ rangeStart, rangeEnd, total, page }: FooterProps) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground">
        Affichage de{" "}
        <span className="font-medium text-foreground tabular-nums">
          {rangeStart}-{rangeEnd}
        </span>{" "}
        sur <span className="font-medium text-foreground tabular-nums">{total}</span> RDV
      </p>

      <PagePill page={page} />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="rounded-lg">
          Précédent
        </Button>
        <Button variant="outline" size="sm" className="rounded-lg">
          Suivant
        </Button>
      </div>
    </div>
  );
}

function PagePill({ page }: { page: number }) {
  return (
    <div
      role="navigation"
      aria-label="Pagination"
      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md ring-1 ring-white/5 dark:bg-slate-950"
    >
      <button
        type="button"
        aria-label="Page précédente"
        className="flex size-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className="size-3.5" />
      </button>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-px bg-white/20" />
        <span className="px-2 tabular-nums">Page {page}</span>
        <span className="h-3 w-px bg-white/20" />
      </span>
      <button
        type="button"
        aria-label="Page suivante"
        className="flex size-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ChevronRight className="size-3.5" />
      </button>
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
