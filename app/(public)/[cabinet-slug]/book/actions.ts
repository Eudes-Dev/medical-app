/**
 * Server Actions du tunnel public de réservation.
 *
 * Toutes les actions de ce fichier sont **non authentifiées** (patients
 * invités). Elles doivent donc:
 * - Valider strictement leurs entrées avec Zod (date dans le futur, max 90j)
 * - Limiter le débit par IP (rate-limiter en mémoire, story 5.3 / SEC-001)
 * - Ne renvoyer aucune information personnelle (PII) — `select` Prisma
 *   limité à `startTime` / `endTime`.
 *
 * @module app/(public)/[cabinet-slug]/book/actions
 */

"use server";

import { addDays, addMinutes, startOfToday } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CABINET_DEFAULT_SLUG } from "@/lib/cabinet/config";
import { filterAvailableSlots, isOverlapping } from "@/lib/cabinet/slots";
import { toMinutes, type WorkingHourRange } from "@/lib/cabinet/working-hours";
import {
  zonedDayOfWeek,
  zonedMinutes,
  zonedDayBoundsUtc,
} from "@/lib/cabinet/timezone";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

/**
 * Seuils de rate-limiting par IP (story 5.3, SEC-001).
 * Lecture (créneaux) plus permissive ; création de RDV plus stricte.
 */
const RATE_LIMITS = {
  /** Lecture des créneaux disponibles : 30 requêtes / minute / IP. */
  slots: { limit: 30, windowMs: 60_000 },
  /** Création de réservation invité : 5 requêtes / 10 minutes / IP. */
  booking: { limit: 5, windowMs: 10 * 60_000 },
} as const;
import {
  isDayFullyBlocked,
  slotInPartialTimeOff,
  type TimeOffInterval,
} from "@/lib/cabinet/time-off";
import {
  guestBookingSchema,
  type GuestBookingValues,
} from "@/lib/validations/booking";
import { setBookingCookie } from "@/lib/booking/session-cookie";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";
import { sendPractitionerNotify } from "@/lib/email/send-practitioner-notify";
import { sendConfirmationSms } from "@/lib/sms/send-confirmation-sms";
import { getPatientSmsTarget } from "@/lib/sms/phone";

/** Horizon maximal de réservation (en jours). */
const MAX_BOOKING_HORIZON_DAYS = 90;

const getAvailableSlotsSchema = z.object({
  /** Date sélectionnée par le patient. Coerce string → Date pour les payloads JSON. */
  date: z.coerce
    .date()
    .refine((d) => d >= startOfToday(), {
      message: "La date doit être aujourd'hui ou dans le futur.",
    })
    .refine((d) => d <= addDays(startOfToday(), MAX_BOOKING_HORIZON_DAYS), {
      message: `La réservation est limitée à ${MAX_BOOKING_HORIZON_DAYS} jours à l'avance.`,
    }),
});

export type GetAvailableSlotsInput = z.input<typeof getAvailableSlotsSchema>;
export type GetAvailableSlotsResult =
  | { slots: string[] } // ISO strings — sérialisables côté client
  | { error: string }; // message neutre OU code "RATE_LIMITED" (story 5.3)

/**
 * Retourne la liste des créneaux disponibles pour une date donnée.
 *
 * Les plages travaillées sont lues en base (`WorkingHours`) à **chaque appel**
 * (pas de cache à invalider, story 7.1) selon le jour de la semaine de `date`.
 * Si aucune plage active n'est définie ce jour-là, la journée est fermée
 * (`{ slots: [] }`).
 *
 * Un créneau est considéré occupé si son intervalle `[slot, slot+slotDuration)`
 * chevauche un `Appointment` existant dont `status != CANCELLED`.
 */
// PUBLIC: pas d'auth requise — réservation invité (story 4.1).
export async function getAvailableSlots(
  input: GetAvailableSlotsInput,
): Promise<GetAvailableSlotsResult> {
  const parsed = getAvailableSlotsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Date invalide.",
    };
  }

  // Rate-limiting par IP avant toute requête DB (story 5.3, SEC-001).
  const ip = await getClientIp();
  if (!checkRateLimit(`slots:${ip}`, RATE_LIMITS.slots.limit, RATE_LIMITS.slots.windowMs).ok) {
    return { error: "RATE_LIMITED" };
  }

  const { date } = parsed.data;
  // 0=Dimanche … 6=Samedi — jour de semaine en heure de Paris (story 5.3),
  // aligné avec la convention WorkingHours.dayOfWeek.
  const dayOfWeek = zonedDayOfWeek(date);
  // Bornes UTC du jour de Paris ciblé (REL-001) — indépendantes du fuseau serveur.
  const { startUtc, endUtc } = zonedDayBoundsUtc(date);

  try {
    // Plages travaillées du jour (story 7.1). Aucune plage active ⇒ jour fermé.
    const ranges: WorkingHourRange[] = await prisma.workingHours.findMany({
      where: { dayOfWeek, active: true },
      select: { startTime: true, endTime: true, slotDuration: true },
    });
    if (ranges.length === 0) {
      return { slots: [] };
    }

    const [appointments, timeOffs] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          startTime: { gte: startUtc, lt: endUtc },
          status: { not: "CANCELLED" },
        },
        select: { startTime: true, endTime: true },
      }),
      // Exceptions actives (congés / fériés story 7.2) intersectant la date.
      prisma.timeOff.findMany({
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
      }),
    ]);

    const slots = filterAvailableSlots(date, appointments, ranges, timeOffs);

    return { slots: slots.map((s) => s.start.toISOString()) };
  } catch (err) {
    console.error("[getAvailableSlots] DB error:", err);
    return {
      error:
        "Impossible de récupérer les créneaux disponibles. Veuillez réessayer.",
    };
  }
}

// ============================================================================
// createGuestBooking (Story 4.2)
// ============================================================================

/** Type de consultation par défaut pour les RDV créés via le tunnel public. */
const DEFAULT_GUEST_APPOINTMENT_TYPE = "Première consultation";

export type CreateGuestBookingError =
  | "VALIDATION"
  | "SLOT_TAKEN"
  | "SERVER"
  | "RATE_LIMITED";

export type CreateGuestBookingResult =
  | { success: true; appointmentId: string }
  | { error: CreateGuestBookingError; message?: string };

/**
 * Lookup ou création du patient. Si plusieurs patients partagent le même email
 * (cf. note schéma — `email` n'est PAS `@unique`), on retient le plus ancien.
 */
async function findOrCreatePatient(
  data: GuestBookingValues,
): Promise<{ id: string }> {
  const existing = await prisma.patient.findFirst({
    where: { email: data.email },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.patient.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
    },
    select: { id: true },
  });
}

/** Durée par défaut d'un créneau si aucune plage horaire ne le couvre (minutes). */
const FALLBACK_SLOT_MINUTES = 30;

/**
 * Détermine la durée (minutes) du créneau choisi en lisant la plage
 * `WorkingHours` du jour qui le contient (story 7.1). Fallback à
 * {@link FALLBACK_SLOT_MINUTES} si aucune plage active ne couvre l'instant
 * (incohérence entre l'horaire affiché et la soumission).
 */
async function resolveSlotDuration(slot: Date): Promise<number> {
  const ranges = await prisma.workingHours.findMany({
    where: { dayOfWeek: zonedDayOfWeek(slot), active: true },
    select: { startTime: true, endTime: true, slotDuration: true },
  });
  // Heure murale du créneau en Paris (story 5.3) — cohérente avec les bornes
  // de plage "HH:mm" heure de Paris.
  const slotMin = zonedMinutes(slot);
  const containing = ranges.find(
    (r) => slotMin >= toMinutes(r.startTime) && slotMin < toMinutes(r.endTime),
  );
  return containing?.slotDuration ?? FALLBACK_SLOT_MINUTES;
}

/**
 * Crée un rendez-vous "invité".
 *
 * Étapes:
 *  1. Validation Zod stricte (serveur — défense en profondeur).
 *  2. Rate-limiting par IP (story 5.3, SEC-001).
 *  3. Vérification anti-collision : si le créneau est devenu indisponible
 *     entre la sélection et la soumission → `SLOT_TAKEN`.
 *  4. Lookup / création du Patient (par email).
 *  5. Création de l'Appointment (status PENDING, type "Première consultation").
 *  6. Pose du cookie HTTP-only signé contenant l'`appointmentId`.
 *
 * Aucune information personnelle n'est renvoyée dans les erreurs.
 */
// PUBLIC: pas d'auth requise — réservation invité (story 4.2).
export async function createGuestBooking(
  input: GuestBookingValues,
): Promise<CreateGuestBookingResult> {
  const parsed = guestBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  // Rate-limiting par IP (story 5.3, SEC-001) — seuil de création plus strict
  // que la lecture. Vérifié après la validation Zod, avant toute requête DB.
  const ip = await getClientIp();
  if (!checkRateLimit(`booking:${ip}`, RATE_LIMITS.booking.limit, RATE_LIMITS.booking.windowMs).ok) {
    return { error: "RATE_LIMITED" };
  }

  const data = parsed.data;
  const slot = new Date(data.slotISO);
  // Bornes UTC du jour de Paris du créneau (story 5.3) pour les requêtes du jour.
  const { startUtc, endUtc } = zonedDayBoundsUtc(slot);

  try {
    // Story 7.3 : si un type de soin est soumis, on revalide côté serveur qu'il
    // est bien `active && isPublic` (défense en profondeur AC 9 — un client
    // obsolète ne doit pas réserver un service privé/archivé). La durée réelle
    // (`endTime`) et le libellé-instantané (`type`) en proviennent alors.
    // Sinon (aucun service public configuré), repli : durée = slotDuration de la
    // plage WorkingHours (story 7.1), type = "Première consultation".
    let appointmentType = DEFAULT_GUEST_APPOINTMENT_TYPE;
    let serviceTypeId: string | undefined;
    let slotMinutes: number;
    if (data.serviceTypeId) {
      const service = await prisma.serviceType.findFirst({
        where: { id: data.serviceTypeId, active: true, isPublic: true },
        select: { id: true, label: true, durationMin: true },
      });
      if (!service) {
        return {
          error: "VALIDATION",
          message: "Ce type de soin n'est plus disponible.",
        };
      }
      appointmentType = service.label;
      serviceTypeId = service.id;
      slotMinutes = service.durationMin;
    } else {
      slotMinutes = await resolveSlotDuration(slot);
    }
    const endTime = addMinutes(slot, slotMinutes);

    // 3. Anti-collision — on relit les RDV du jour et on applique `isOverlapping`.
    const sameDayAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startUtc, lt: endUtc },
        status: { not: "CANCELLED" },
      },
      select: { startTime: true, endTime: true },
    });
    const collision = sameDayAppointments.some((apt) =>
      isOverlapping(slot, slotMinutes, apt),
    );
    if (collision) {
      return { error: "SLOT_TAKEN" };
    }

    // 3.bis Défense en profondeur (story 7.2, AC 6) — un client obsolète ne
    // doit pas pouvoir réserver un créneau bloqué par une exception active.
    // Le tunnel public renvoie déjà `[]` côté `getAvailableSlots`, mais rien
    // n'empêche un POST direct avec un ancien `slotISO`.
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
      isDayFullyBlocked(slot, timeOffs) ||
      slotInPartialTimeOff(slot, slotMinutes, timeOffs)
    ) {
      return { error: "SLOT_TAKEN" };
    }

    // 4. Patient (lookup par email, plus ancien si homonyme).
    const patient = await findOrCreatePatient(data);

    // 5. Appointment avec cancellationToken UUID.
    const cancellationToken = crypto.randomUUID();
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        startTime: slot,
        endTime,
        status: "PENDING",
        type: appointmentType,
        cancellationToken,
        // N'ajoute la FK que si un service public a été résolu (repli = absent).
        ...(serviceTypeId ? { serviceTypeId } : {}),
      },
      select: { id: true },
    });

    // 6. Cookie de session signé.
    await setBookingCookie(appointment.id);

    // 7. Notifications fire-and-forget — ne bloquent pas la réponse.
    if (data.email) {
      void sendConfirmationEmail({
        appointmentId: appointment.id,
        patientEmail: data.email,
        patientFirstName: data.firstName,
        appointmentDate: slot,
        appointmentType,
        cancellationToken,
        cabinetSlug: CABINET_DEFAULT_SLUG,
      }).catch((err) => console.error("[email:confirmation] envoi échoué:", err));
    } else {
      // Lecture stricte AC 6.3-1 : SMS de confirmation uniquement quand le
      // patient n'a pas d'email. Évite la double notification email + SMS et
      // limite les coûts SMS.
      const smsTarget = getPatientSmsTarget({ phone: data.phone });
      if (smsTarget) {
        void sendConfirmationSms({
          appointmentId: appointment.id,
          patientPhone: smsTarget,
          patientFirstName: data.firstName,
          // Branche `else` : data.email est forcément falsy ici → pas de
          // fallbackEmail (lecture stricte AC 6.3-1). QA CODE-001.
          appointmentDate: slot,
          appointmentType,
          cancellationToken,
          cabinetSlug: CABINET_DEFAULT_SLUG,
        }).catch((err) => console.error("[sms:confirmation] envoi échoué:", err));
      }
    }

    void sendPractitionerNotify({
      appointmentId: appointment.id,
      patientFirstName: data.firstName,
      patientLastName: data.lastName,
      patientPhone: data.phone,
      patientEmail: data.email,
      appointmentDate: slot,
      appointmentType,
    }).catch((err) => console.error("[email:practitioner] envoi échoué:", err));

    return { success: true, appointmentId: appointment.id };
  } catch (err) {
    // Ne JAMAIS exposer le détail de l'erreur (PII / structure interne).
    console.error("[createGuestBooking] error:", err);
    return { error: "SERVER" };
  }
}
