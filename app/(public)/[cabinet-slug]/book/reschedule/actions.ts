/**
 * Server Action de reprogrammation d'un rendez-vous par token (story 8.1).
 *
 * **Publique** (non authentifiée) : la protection repose sur le
 * `cancellationToken` UUID opaque (story 6.1, `@unique`, non devinable) réutilisé
 * comme **jeton de gestion** du RDV, + le rate-limiter par IP (story 5.3,
 * SEC-001). `requireUser()` ne s'applique donc pas ici.
 *
 * Symétrique de `book/cancel/actions.ts`. Garde-fous (app médicale) :
 * - **Aucune fuite** : token inconnu / RDV terminé ⇒ `INVALID` (message neutre)
 *   — pas d'énumération de l'existence d'un RDV.
 * - **Délai minimum** (AC 3) appliqué côté serveur (défense en profondeur).
 * - **Anti-collision** + défense `TimeOff` sur le nouveau créneau, en excluant
 *   le RDV courant (on déplace, on n'entre pas en conflit avec soi-même).
 * - **Durée conservée** : on déplace le RDV sans recalculer sa durée.
 *
 * @module app/(public)/[cabinet-slug]/book/reschedule/actions
 */

"use server";

import { addDays, addMinutes, startOfToday } from "date-fns";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CABINET_DEFAULT_SLUG } from "@/lib/cabinet/config";
import { isOverlapping } from "@/lib/cabinet/slots";
import { zonedDayBoundsUtc } from "@/lib/cabinet/timezone";
import {
  isDayFullyBlocked,
  slotInPartialTimeOff,
  type TimeOffInterval,
} from "@/lib/cabinet/time-off";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { canStillManage } from "@/lib/booking/reschedule-policy";
import { sendRescheduleEmail } from "@/lib/email/send-reschedule";

export type RescheduleByTokenResult =
  | { success: true }
  | { error: "INVALID" | "TOO_LATE" | "SLOT_TAKEN" | "RATE_LIMITED" | "SERVER" };

/** Reprogrammation publique : 10 tentatives / 10 min / IP (anti-abus, story 8.1). */
const RESCHEDULE_RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 } as const;

/** Horizon maximal de réservation (en jours) — aligné sur le tunnel public. */
const MAX_BOOKING_HORIZON_DAYS = 90;

/**
 * Validation du nouveau créneau : ISO 8601 avec offset, strictement futur,
 * ≤ {@link MAX_BOOKING_HORIZON_DAYS} jours (mêmes bornes que `guestBookingSchema`).
 */
const newSlotSchema = z
  .string()
  .datetime({ offset: true, message: "Créneau invalide" })
  .refine((s) => new Date(s) > new Date(), {
    message: "Le créneau doit être dans le futur",
  })
  .refine((s) => new Date(s) <= addDays(startOfToday(), MAX_BOOKING_HORIZON_DAYS), {
    message: `La réservation est limitée à ${MAX_BOOKING_HORIZON_DAYS} jours à l'avance.`,
  });

/**
 * Reprogramme le rendez-vous identifié par son `cancellationToken` vers le
 * créneau `newSlotISO`.
 *
 * @param token UUID opaque transmis dans le lien email/SMS (`?token=`).
 * @param newSlotISO Nouveau créneau (ISO 8601 avec offset).
 */
// PUBLIC: pas d'auth — protection token + rate-limiter (story 8.1).
export async function rescheduleByToken(
  token: string,
  newSlotISO: string,
): Promise<RescheduleByTokenResult> {
  if (typeof token !== "string" || token.length === 0) {
    return { error: "INVALID" };
  }

  // Validation stricte du nouveau créneau (Zod — aucune requête DB).
  const parsedSlot = newSlotSchema.safeParse(newSlotISO);
  if (!parsedSlot.success) {
    // Pas de code VALIDATION dédié : on renvoie INVALID (neutre, anti-énumération).
    return { error: "INVALID" };
  }

  // a. Rate-limiting par IP avant toute requête DB (story 5.3, SEC-001).
  const ip = await getClientIp();
  if (
    !checkRateLimit(
      `reschedule:${ip}`,
      RESCHEDULE_RATE_LIMIT.limit,
      RESCHEDULE_RATE_LIMIT.windowMs,
    ).ok
  ) {
    return { error: "RATE_LIMITED" };
  }

  const newStart = new Date(parsedSlot.data);

  try {
    // b. Lookup par token opaque.
    const appointment = await prisma.appointment.findUnique({
      where: { cancellationToken: token },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        type: true,
        cancellationToken: true,
        patient: { select: { firstName: true, email: true } },
      },
    });

    // Token inconnu : message neutre (pas d'énumération).
    if (!appointment) {
      return { error: "INVALID" };
    }

    // c. RDV annulé ou terminé : non reprogrammable (neutre).
    if (
      appointment.status === "CANCELLED" ||
      appointment.status === "COMPLETED"
    ) {
      return { error: "INVALID" };
    }

    // d. Délai minimum (AC 3) sur le RDV **courant** — défense en profondeur.
    if (!canStillManage(appointment.startTime)) {
      return { error: "TOO_LATE" };
    }

    // Durée conservée : on déplace le RDV sans recalculer sa durée (AC 5g).
    const durationMs =
      appointment.endTime.getTime() - appointment.startTime.getTime();
    const durationMinutes = durationMs / 60_000;
    const newEnd = addMinutes(newStart, durationMinutes);

    // Bornes UTC du jour de Paris du nouveau créneau (REL-001) pour les requêtes.
    const { startUtc, endUtc } = zonedDayBoundsUtc(newStart);

    // e. Anti-collision sur le nouveau créneau — en **excluant le RDV courant**
    //    (on ne doit pas entrer en conflit avec soi-même lors d'un déplacement).
    const sameDayAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startUtc, lt: endUtc },
        status: { not: "CANCELLED" },
        id: { not: appointment.id },
      },
      select: { startTime: true, endTime: true },
    });
    const collision = sameDayAppointments.some((apt) =>
      isOverlapping(newStart, durationMinutes, apt),
    );
    if (collision) {
      return { error: "SLOT_TAKEN" };
    }

    // f. Défense `TimeOff` (story 7.2) — un POST direct ne doit pas viser un
    //    créneau dans un jour/plage bloqué.
    const timeOffs: TimeOffInterval[] = await prisma.timeOff.findMany({
      where: {
        active: true,
        startDate: { lt: endUtc },
        endDate: { gte: startUtc },
      },
      select: {
        startDate: true,
        endDate: true,
        allDay: true,
        startTime: true,
        endTime: true,
      },
    });
    if (
      isDayFullyBlocked(newStart, timeOffs) ||
      slotInPartialTimeOff(newStart, durationMinutes, timeOffs)
    ) {
      return { error: "SLOT_TAKEN" };
    }

    // g. Update de start/end uniquement (conserve patientId, type, status, token).
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { startTime: newStart, endTime: newEnd },
    });

    // Email de reprogrammation fire-and-forget (réutilise le canal 6.1).
    if (appointment.patient.email && appointment.cancellationToken) {
      void sendRescheduleEmail({
        appointmentId: appointment.id,
        patientEmail: appointment.patient.email,
        patientFirstName: appointment.patient.firstName,
        appointmentDate: newStart,
        appointmentType: appointment.type,
        cancellationToken: appointment.cancellationToken,
        cabinetSlug: CABINET_DEFAULT_SLUG,
      }).catch((err) =>
        console.error("[email:reschedule] envoi échoué:", err),
      );
    }

    // L'agenda praticien doit refléter le déplacement.
    revalidatePath("/dashboard/calendar");

    return { success: true };
  } catch (err) {
    // Ne jamais exposer le détail (PII / structure interne).
    console.error("[rescheduleByToken] error:", err);
    return { error: "SERVER" };
  }
}
