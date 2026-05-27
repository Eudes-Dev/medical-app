"use server";

/**
 * Server Actions de configuration des horaires d'ouverture (story 7.1).
 *
 * Single-tenant : un seul jeu d'horaires `WorkingHours` pour l'unique cabinet.
 * Toutes les actions exigent un praticien authentifié (`requireUser()` —
 * défense en profondeur derrière le middleware `/dashboard`).
 *
 * @module app/dashboard/settings/schedule/actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { weekScheduleSchema } from "@/lib/validations/working-hours";

/** Chemin de la page à revalider après sauvegarde. */
const SCHEDULE_PATH = "/dashboard/settings/schedule";

/** Une plage telle que renvoyée au client. */
export interface RangeDTO {
  startTime: string;
  endTime: string;
  slotDuration: number;
  active: boolean;
}

/** Le planning d'un jour (0=Dimanche … 6=Samedi) avec ses plages. */
export interface DayScheduleDTO {
  dayOfWeek: number;
  ranges: RangeDTO[];
}

/**
 * Entrée brute de `saveWorkingHours` (sérialisable, `slotDuration: number`).
 * Narrowée par `weekScheduleSchema` avant toute écriture — c'est Zod qui
 * garantit que `slotDuration ∈ {15,30,45,60}`.
 */
export type SaveWorkingHoursInput = DayScheduleDTO[];

export type SaveWorkingHoursResult =
  | { success: true }
  | { error: string };

/**
 * Renvoie le planning hebdomadaire complet : un tableau **ordonné** des 7 jours
 * (index 0=Dimanche … 6=Samedi). Les jours sans plage renvoient `ranges: []`.
 * Les plages d'un même jour sont triées par heure de début.
 */
export async function getWorkingHours(): Promise<DayScheduleDTO[]> {
  await requireUser();

  const rows = await prisma.workingHours.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      slotDuration: true,
      active: true,
    },
  });

  // Squelette des 7 jours, puis distribution des lignes par dayOfWeek.
  const week: DayScheduleDTO[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    ranges: [],
  }));
  for (const row of rows) {
    week[row.dayOfWeek]?.ranges.push({
      startTime: row.startTime,
      endTime: row.endTime,
      slotDuration: row.slotDuration,
      active: row.active,
    });
  }
  return week;
}

/**
 * Remplace **intégralement** le jeu d'horaires par celui fourni.
 *
 * Stratégie « dernière sauvegarde gagne » : `deleteMany` global puis
 * `createMany` des plages validées, dans une transaction. Les plages
 * désactivées (`active=false`) sont conservées (insérées telles quelles) afin
 * de respecter l'AC 4 (désactiver sans supprimer).
 *
 * Validation Zod serveur avant toute écriture ; toute erreur DB renvoie un
 * message générique (pas de fuite), le détail restant loggé serveur.
 */
export async function saveWorkingHours(
  input: SaveWorkingHoursInput,
): Promise<SaveWorkingHoursResult> {
  await requireUser();

  const parsed = weekScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Horaires invalides.",
    };
  }

  // Aplatissement semaine → lignes `working_hours`.
  const rows = parsed.data.flatMap((day) =>
    day.ranges.map((r) => ({
      dayOfWeek: day.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDuration: r.slotDuration,
      active: r.active,
    })),
  );

  try {
    await prisma.$transaction([
      prisma.workingHours.deleteMany({}),
      prisma.workingHours.createMany({ data: rows }),
    ]);

    revalidatePath(SCHEDULE_PATH);
    return { success: true };
  } catch (err) {
    console.error("[saveWorkingHours] error:", err);
    return {
      error: "Impossible d'enregistrer les horaires. Veuillez réessayer.",
    };
  }
}
