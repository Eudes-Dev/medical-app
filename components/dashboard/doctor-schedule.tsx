"use client";

/**
 * Carte "Doctor's Schedule" du dashboard.
 *
 * Affiche :
 * - Titre + menu (ellipsis)
 * - Statistiques : Available, Unavailable, Leaves (avec totaux)
 * - Liste de médecins : avatar, nom, spécialité, statut (pill)
 * - Lien "See All"
 */

import Link from "next/link";
import { Ellipsis, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type DoctorStatus = "available" | "unavailable" | "leaves";

export interface DoctorScheduleStat {
  label: string;
  count: number;
}

export interface DoctorScheduleItem {
  id: string;
  name: string;
  specialization: string;
  status: DoctorStatus;
  avatarUrl?: string;
}

export interface DoctorScheduleProps {
  /** Titre de la carte */
  title?: string;
  /** Statistiques : Available, Unavailable, Leaves */
  stats?: DoctorScheduleStat[];
  /** Liste des médecins à afficher */
  doctors?: DoctorScheduleItem[];
  /** URL du lien "See All" */
  seeAllHref?: string;
}

const DEFAULT_STATS: DoctorScheduleStat[] = [
  { label: "Available", count: 116 },
  { label: "Unavailable", count: 32 },
  { label: "Leaves", count: 14 },
];

const DEFAULT_DOCTORS: DoctorScheduleItem[] = [
  {
    id: "1",
    name: "Theresa Lane",
    specialization: "Anesthesiology",
    status: "available",
  },
  {
    id: "2",
    name: "Wilson Howard",
    specialization: "Dermatology",
    status: "available",
  },
  {
    id: "3",
    name: "Jacob Torff",
    specialization: "General Surgery",
    status: "unavailable",
  },
];

function getStatusPillClass(status: DoctorStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "unavailable":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    case "leaves":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: DoctorStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "unavailable":
      return "Unavailable";
    case "leaves":
      return "Leaves";
    default:
      return status;
  }
}

export function DoctorSchedule({
  title = "Doctor's Schedule",
  stats = DEFAULT_STATS,
  doctors = DEFAULT_DOCTORS,
  seeAllHref = "#",
}: DoctorScheduleProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col w-full">
      <CardHeader className="shrink-0 flex flex-row items-center justify-between gap-2 pb-4">
        <CardTitle className="text-lg font-bold truncate">{title}</CardTitle>
        <Button size="icon" variant="ghost" className="shrink-0 size-8">
          <Ellipsis size={16} strokeWidth={2} />
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-6 pt-0">
        {/* Statistiques : Available, Unavailable, Leaves */}
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-lg bg-muted/60 px-4 py-3 min-w-0"
            >
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums">
                  {stat.count}
                </span>
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
            </div>
          ))}
        </div>

        {/* Liste des médecins */}
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-base font-bold">List of Doctor&apos;s</h3>
            <Link
              href={seeAllHref}
              className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              See All
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
            {doctors.map((doctor) => (
              <li
                key={doctor.id}
                className="flex items-center gap-3 py-2 min-w-0 border-b border-border last:border-0 last:pb-0 shrink-0"
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={doctor.avatarUrl} alt={doctor.name} />
                  <AvatarFallback className="text-sm font-medium bg-muted">
                    {doctor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{doctor.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {doctor.specialization}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                    getStatusPillClass(doctor.status)
                  )}
                >
                  {getStatusLabel(doctor.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
