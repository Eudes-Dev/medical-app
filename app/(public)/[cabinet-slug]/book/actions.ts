/**
 * Server Actions du tunnel public de réservation.
 *
 * Toutes les actions de ce fichier sont **non authentifiées** (patients
 * invités). Elles doivent donc:
 * - Valider strictement leurs entrées avec Zod (date dans le futur, max 90j)
 * - Limiter le débit par IP (TODO: brancher le rate limiter de la story 13.5)
 * - Ne renvoyer aucune information personnelle (PII) — `select` Prisma
 *   limité à `startTime` / `endTime`.
 *
 * @module app/(public)/[cabinet-slug]/book/actions
 */

"use server";

import { addDays, addMinutes, startOfDay, startOfToday, endOfDay } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CABINET_INFO, CABINET_DEFAULT_SLUG } from "@/lib/cabinet/config";
import { filterAvailableSlots, isOverlapping } from "@/lib/cabinet/slots";
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
  | { error: string };

/**
 * Retourne la liste des créneaux disponibles pour une date donnée.
 *
 * Un créneau est considéré occupé si son intervalle `[slot, slot+30min)`
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

  // TODO(story 13.5): brancher le rate limiter par IP avant la requête DB.
  // Pour l'instant: fallback no-op — à tracer dans le backlog.

  const { date } = parsed.data;

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfDay(date), lt: endOfDay(date) },
        status: { not: "CANCELLED" },
      },
      select: { startTime: true, endTime: true },
    });

    const slots = filterAvailableSlots(
      date,
      appointments,
      CABINET_INFO.openingHours,
    );

    return { slots: slots.map((s) => s.toISOString()) };
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

export type CreateGuestBookingError = "VALIDATION" | "SLOT_TAKEN" | "SERVER";

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

/**
 * Crée un rendez-vous "invité".
 *
 * Étapes:
 *  1. Validation Zod stricte (serveur — défense en profondeur).
 *  2. TODO rate limiter (story 13.5).
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

  // TODO(story 13.5): brancher le rate limiter par IP avant la requête DB.
  // Même TODO que `getAvailableSlots` — à mutualiser lorsque le limiter
  // sera disponible.

  const data = parsed.data;
  const slot = new Date(data.slotISO);
  const { slotMinutes } = CABINET_INFO.openingHours;
  const endTime = addMinutes(slot, slotMinutes);

  try {
    // 3. Anti-collision — on relit les RDV du jour et on applique `isOverlapping`.
    const sameDayAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfDay(slot), lt: endOfDay(slot) },
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
        type: DEFAULT_GUEST_APPOINTMENT_TYPE,
        cancellationToken,
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
        appointmentType: DEFAULT_GUEST_APPOINTMENT_TYPE,
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
          appointmentType: DEFAULT_GUEST_APPOINTMENT_TYPE,
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
      appointmentType: DEFAULT_GUEST_APPOINTMENT_TYPE,
    }).catch((err) => console.error("[email:practitioner] envoi échoué:", err));

    return { success: true, appointmentId: appointment.id };
  } catch (err) {
    // Ne JAMAIS exposer le détail de l'erreur (PII / structure interne).
    console.error("[createGuestBooking] error:", err);
    return { error: "SERVER" };
  }
}
