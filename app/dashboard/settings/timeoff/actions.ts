"use server";

/**
 * Server Actions de gestion des exceptions d'agenda (story 7.2).
 *
 * Single-tenant : un seul jeu d'exceptions `TimeOff` pour l'unique cabinet.
 * Toutes les actions exigent un praticien authentifié (`requireUser()`,
 * défense en profondeur derrière le middleware `/dashboard`).
 *
 * Convention :
 * - `getTimeOffs` matérialise les fériés de l'année demandée (idempotent).
 * - `previewTimeOffImpact` ne fait **aucune** écriture (lecture seule).
 * - `createTimeOff` est la seule porte d'écriture pour les `MANUAL` ; elle
 *   peut, sur opt-in explicite, annuler les RDV impactés et déclencher les
 *   emails d'annulation (réutilisation `sendCancellationEmail`, 6.1).
 *
 * @module app/dashboard/settings/timeoff/actions
 */

import { revalidatePath } from "next/cache";
import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import { timeOffSchema, type TimeOffInput } from "@/lib/validations/time-off";
import {
  computeFrenchHolidays,
  type FrenchHoliday,
} from "@/lib/cabinet/holidays";
import { dayKey, type TimeOffInterval } from "@/lib/cabinet/time-off";
import { toMinutes } from "@/lib/cabinet/working-hours";
import { sendCancellationEmail } from "@/lib/email/send-cancellation";

/** Chemins à revalider après écriture (page settings + calendrier praticien). */
const TIMEOFF_PATH = "/dashboard/settings/timeoff";
const CALENDAR_PATH = "/dashboard/calendar";

/** Représentation sérialisable d'une `TimeOff` envoyée au client. */
export interface TimeOffDTO {
  id: string;
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  source: "MANUAL" | "HOLIDAY";
  active: boolean;
}

/** Représentation minimale d'un RDV impacté par une exception (preview). */
export interface ImpactedAppointmentDTO {
  id: string;
  startTime: string; // ISO
  endTime: string;
  type: string;
  patient: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export type CreateTimeOffResult =
  | { success: true; impactedCount: number; notifiedCount: number }
  | { error: string };

export type SimpleResult = { success: true } | { error: string };

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Convertit une `Date` Prisma `@db.Date` en chaîne ISO "YYYY-MM-DD" sans
 * dérive de fuseau : on lit les composantes UTC (le driver `pg` renvoie un
 * `Date` UTC pour le type `DATE`).
 */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" → `Date` UTC à 00:00 (cohérent avec `@db.Date`). */
function parseIsoDateUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Mappe une ligne Prisma vers le DTO sérialisable. */
function toTimeOffDTO(row: {
  id: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  source: "MANUAL" | "HOLIDAY";
  active: boolean;
}): TimeOffDTO {
  return {
    id: row.id,
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    allDay: row.allDay,
    startTime: row.startTime,
    endTime: row.endTime,
    reason: row.reason,
    source: row.source,
    active: row.active,
  };
}

/** Forme minimale d'un RDV consommée par `filterImpactedAppointments`. */
interface AppointmentTimeInterval {
  startTime: Date;
  endTime: Date;
}

/** Forme minimale d'une `TimeOff` validée consommée par le filtre d'impact. */
interface TimeOffFilterContext {
  allDay: boolean;
  startDate: Date;
  startTime?: string | undefined;
  endTime?: string | undefined;
}

/**
 * Retient les RDV qui tombent effectivement dans la fenêtre bloquée.
 * - `allDay` ⇒ tous les candidats (la requête SQL pré-filtre déjà sur la fenêtre).
 * - plage intra-journée ⇒ chevauchement horaire strict sur le jour cible.
 *
 * Helper privé partagé entre `previewTimeOffImpact` (lecture) et
 * `createTimeOff` (écriture transactionnelle) pour garantir des règles
 * d'impact strictement identiques.
 */
function filterImpactedAppointments<T extends AppointmentTimeInterval>(
  candidates: T[],
  v: TimeOffFilterContext,
): T[] {
  return candidates.filter((apt) => {
    if (v.allDay) return true;
    if (dayKey(apt.startTime) !== dayKey(v.startDate)) return false;
    const aptStart =
      apt.startTime.getHours() * 60 + apt.startTime.getMinutes();
    const aptEnd = apt.endTime.getHours() * 60 + apt.endTime.getMinutes();
    const offStart = v.startTime ? toMinutes(v.startTime) : 0;
    const offEnd = v.endTime ? toMinutes(v.endTime) : 24 * 60;
    return aptStart < offEnd && aptEnd > offStart;
  });
}

/**
 * Insère les fériés de `year` (`source=HOLIDAY`) absents en base. Idempotent :
 * un appel répété ne ré-insère rien. Ne touche pas aux fériés désactivés
 * (`active=false`) : leur état est conservé d'une ouverture à l'autre.
 */
async function ensureHolidaysMaterialized(year: number): Promise<void> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const existing = await prisma.timeOff.findMany({
    where: {
      source: "HOLIDAY",
      startDate: { gte: yearStart, lte: yearEnd },
    },
    select: { startDate: true },
  });
  const existingKeys = new Set(existing.map((r) => toIsoDate(r.startDate)));

  const toInsert: FrenchHoliday[] = computeFrenchHolidays(year).filter(
    (h) => !existingKeys.has(h.date),
  );
  if (toInsert.length === 0) return;

  await prisma.timeOff.createMany({
    data: toInsert.map((h) => ({
      startDate: parseIsoDateUtc(h.date),
      endDate: parseIsoDateUtc(h.date),
      allDay: true,
      reason: h.label,
      source: "HOLIDAY" as const,
      active: true,
    })),
  });
}

// ---------------------------------------------------------------------------
// Lecture : getTimeOffs
// ---------------------------------------------------------------------------

/**
 * Renvoie les exceptions de l'année `year` séparées par nature
 * (`manual` / `holidays`). Matérialise au passage les fériés manquants.
 *
 * `manual` inclut **toute** exception manuelle dont la fenêtre intersecte
 * l'année (pratique : un congé à cheval sur 12/31 → 01/02 apparaît dans les
 * deux années). `holidays` ne contient que les jours fériés de `year`.
 */
export async function getTimeOffs(
  year: number,
): Promise<{ manual: TimeOffDTO[]; holidays: TimeOffDTO[] }> {
  await requireUser();
  await ensureHolidaysMaterialized(year);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const [manualRows, holidayRows] = await Promise.all([
    prisma.timeOff.findMany({
      where: {
        source: "MANUAL",
        // Intersection [startDate, endDate] × [yearStart, yearEnd]
        startDate: { lte: yearEnd },
        endDate: { gte: yearStart },
      },
      orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.timeOff.findMany({
      where: {
        source: "HOLIDAY",
        startDate: { gte: yearStart, lte: yearEnd },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return {
    manual: manualRows.map(toTimeOffDTO),
    holidays: holidayRows.map(toTimeOffDTO),
  };
}

// ---------------------------------------------------------------------------
// Lecture : previewTimeOffImpact
// ---------------------------------------------------------------------------

/**
 * Liste les rendez-vous non-`CANCELLED` qui tombent dans la fenêtre proposée
 * — sans rien écrire. Utilisé par l'UI pour l'avertissement avant création
 * (AC 4 : flux synchrone, praticien dans la boucle).
 */
export async function previewTimeOffImpact(
  input: TimeOffInput,
): Promise<{ impacted: ImpactedAppointmentDTO[] } | { error: string }> {
  await requireUser();

  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  const v = parsed.data;

  try {
    const windowStart = startOfDay(v.startDate);
    const windowEnd = endOfDay(v.endDate);

    const candidates = await prisma.appointment.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { startTime: "asc" },
      include: {
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    const impacted = filterImpactedAppointments(candidates, v);

    return {
      impacted: impacted.map((a) => ({
        id: a.id,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        type: a.type,
        patient: {
          firstName: a.patient.firstName,
          lastName: a.patient.lastName,
          email: a.patient.email ?? null,
        },
      })),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    console.error("[previewTimeOffImpact] error:", err);
    return { error: "Impossible de calculer les RDV impactés." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : createTimeOff
// ---------------------------------------------------------------------------

/**
 * Crée une exception manuelle. Si `notifyCancellations` est vrai, annule
 * **dans la même transaction** les RDV impactés (non-`CANCELLED`) puis
 * déclenche les emails d'annulation en fire-and-forget (réutilisation
 * `sendCancellationEmail` — 6.1). SMS d'annulation hors périmètre.
 */
export async function createTimeOff(
  input: TimeOffInput,
  opts?: { notifyCancellations?: boolean },
): Promise<CreateTimeOffResult> {
  try {
    await requireUser();

    const parsed = timeOffSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Données invalides.",
      };
    }
    const v = parsed.data;

    const startDate = parseIsoDateUtc(
      `${v.startDate.getFullYear()}-${String(v.startDate.getMonth() + 1).padStart(2, "0")}-${String(v.startDate.getDate()).padStart(2, "0")}`,
    );
    const endDate = parseIsoDateUtc(
      `${v.endDate.getFullYear()}-${String(v.endDate.getMonth() + 1).padStart(2, "0")}-${String(v.endDate.getDate()).padStart(2, "0")}`,
    );

    const notify = opts?.notifyCancellations === true;
    // Fenêtre d'identification des RDV impactés (bornes calendaires de la TimeOff).
    const windowStart = startOfDay(v.startDate);
    const windowEnd = endOfDay(v.endDate);

    // Le `findMany` est volontairement DANS la transaction : un RDV créé entre
    // la lecture et l'écriture serait sinon ignoré par `notifyCancellations`
    // (TOC/TOU). Mitigation supplémentaire côté tunnel public via la défense
    // en profondeur AC 6.
    type ImpactedRow = {
      id: string;
      startTime: Date;
      endTime: Date;
      type: string;
      patient: { firstName: string; email: string | null };
    };
    let impacted: ImpactedRow[] = [];

    await prisma.$transaction(async (tx) => {
      const candidates = await tx.appointment.findMany({
        where: {
          status: { not: "CANCELLED" },
          startTime: { gte: windowStart, lte: windowEnd },
        },
        include: {
          patient: { select: { firstName: true, email: true } },
        },
      });
      impacted = filterImpactedAppointments(candidates, v);

      await tx.timeOff.create({
        data: {
          startDate,
          endDate,
          allDay: v.allDay,
          startTime: v.allDay ? null : (v.startTime ?? null),
          endTime: v.allDay ? null : (v.endTime ?? null),
          reason: v.reason ?? null,
          source: "MANUAL",
          active: true,
        },
      });

      if (notify && impacted.length > 0) {
        await tx.appointment.updateMany({
          where: { id: { in: impacted.map((a) => a.id) } },
          data: { status: "CANCELLED" },
        });
      }
    });

    let notifiedCount = 0;
    if (notify) {
      for (const apt of impacted) {
        if (!apt.patient.email) continue;
        notifiedCount++;
        void sendCancellationEmail({
          appointmentId: apt.id,
          patientEmail: apt.patient.email,
          patientFirstName: apt.patient.firstName,
          appointmentDate: apt.startTime,
          appointmentType: apt.type,
        }).catch((err) =>
          console.error("[email:cancellation] envoi échoué:", err),
        );
      }
    }

    revalidatePath(TIMEOFF_PATH);
    revalidatePath(CALENDAR_PATH);
    return {
      success: true,
      impactedCount: impacted.length,
      notifiedCount,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    console.error("[createTimeOff] error:", err);
    return { error: "Impossible d'enregistrer l'exception. Veuillez réessayer." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : toggleHoliday
// ---------------------------------------------------------------------------

/**
 * Active ou désactive un jour férié sans le supprimer. La désactivation
 * « rend » les créneaux de ce jour sans perdre la matérialisation.
 *
 * Filtre `source=HOLIDAY` : utiliser `deleteTimeOff` pour les `MANUAL`.
 */
export async function toggleHoliday(
  id: string,
  active: boolean,
): Promise<SimpleResult> {
  try {
    await requireUser();
    assertValidUuid(id);

    const result = await prisma.timeOff.updateMany({
      where: { id, source: "HOLIDAY" },
      data: { active },
    });
    if (result.count === 0) {
      return { error: "Jour férié introuvable." };
    }

    revalidatePath(TIMEOFF_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof BadRequestError) {
      return { error: "Identifiant invalide." };
    }
    console.error("[toggleHoliday] error:", err);
    return { error: "Impossible de mettre à jour le jour férié." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : deleteTimeOff
// ---------------------------------------------------------------------------

/**
 * Supprime une exception. Les jours fériés peuvent être supprimés mais seront
 * **re-matérialisés** au prochain `getTimeOffs(year)` (utiliser `toggleHoliday`
 * pour les masquer durablement).
 */
export async function deleteTimeOff(id: string): Promise<SimpleResult> {
  try {
    await requireUser();
    assertValidUuid(id);

    await prisma.timeOff.delete({ where: { id } });

    revalidatePath(TIMEOFF_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof BadRequestError) {
      return { error: "Identifiant invalide." };
    }
    console.error("[deleteTimeOff] error:", err);
    return { error: "Impossible de supprimer l'exception." };
  }
}

// ---------------------------------------------------------------------------
// Lecture : getTimeOffsByDateRange (consommée par le calendrier praticien)
// ---------------------------------------------------------------------------

/**
 * Renvoie les exceptions **actives** qui intersectent la fenêtre affichée par
 * le calendrier praticien (sous la forme `TimeOffInterval` consommable par les
 * helpers purs).
 */
export async function getTimeOffsByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<(TimeOffInterval & { id: string; reason: string | null; source: "MANUAL" | "HOLIDAY" })[]> {
  await requireUser();

  const rows = await prisma.timeOff.findMany({
    where: {
      active: true,
      startDate: { lte: endOfDay(endDate) },
      endDate: { gte: startOfDay(startDate) },
    },
    orderBy: { startDate: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    allDay: r.allDay,
    startTime: r.startTime,
    endTime: r.endTime,
    reason: r.reason,
    source: r.source,
  }));
}
