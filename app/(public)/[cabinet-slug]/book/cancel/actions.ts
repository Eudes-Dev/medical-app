/**
 * Server Action d'annulation d'un rendez-vous par token (story 5.3, CANCEL-ROUTE-001).
 *
 * **Publique** (non authentifiée) : la protection repose sur le `cancellationToken`
 * UUID opaque (story 6.1, `@unique`, non devinable) + le rate-limiter par IP
 * (story 5.3, SEC-001). `requireUser()` ne s'applique donc pas ici.
 *
 * Garde-fous (app médicale) :
 * - **Idempotente** : un RDV déjà `CANCELLED` renvoie un succès silencieux
 *   (jamais d'erreur sur double-clic / lien rejoué).
 * - **Aucune fuite** : un token inconnu renvoie `INVALID` (message neutre côté
 *   UI) — pas d'énumération de l'existence d'un RDV.
 *
 * @module app/(public)/[cabinet-slug]/book/cancel/actions
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmail } from "@/lib/email/send-cancellation";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

export type CancelByTokenResult =
  | { success: true }
  | { error: "INVALID" | "RATE_LIMITED" | "SERVER" };

/** Annulation publique : 10 tentatives / 10 min / IP (anti-abus, story 5.3). */
const CANCEL_RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 } as const;

/**
 * Annule le rendez-vous identifié par son `cancellationToken`.
 *
 * @param token UUID opaque transmis dans le lien email/SMS (`?token=`).
 */
// PUBLIC: pas d'auth — protection token + rate-limiter (story 5.3).
export async function cancelByToken(token: string): Promise<CancelByTokenResult> {
  if (typeof token !== "string" || token.length === 0) {
    return { error: "INVALID" };
  }

  // Rate-limiting par IP avant toute requête DB (story 5.3, SEC-001).
  const ip = await getClientIp();
  if (
    !checkRateLimit(
      `cancel:${ip}`,
      CANCEL_RATE_LIMIT.limit,
      CANCEL_RATE_LIMIT.windowMs,
    ).ok
  ) {
    return { error: "RATE_LIMITED" };
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { cancellationToken: token },
      select: {
        id: true,
        status: true,
        startTime: true,
        type: true,
        patient: { select: { firstName: true, email: true } },
      },
    });

    // Token inconnu : message neutre (pas d'énumération).
    if (!appointment) {
      return { error: "INVALID" };
    }

    // Idempotent : déjà annulé ⇒ succès silencieux (ne jamais échouer un rejeu).
    if (appointment.status === "CANCELLED") {
      return { success: true };
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });

    // Email d'annulation fire-and-forget (réutilise le canal 6.1).
    if (appointment.patient.email) {
      void sendCancellationEmail({
        appointmentId: appointment.id,
        patientEmail: appointment.patient.email,
        patientFirstName: appointment.patient.firstName,
        appointmentDate: appointment.startTime,
        appointmentType: appointment.type,
      }).catch((err) =>
        console.error("[email:cancellation] envoi échoué:", err),
      );
    }

    // L'agenda praticien doit refléter l'annulation.
    revalidatePath("/dashboard/calendar");

    return { success: true };
  } catch (err) {
    // Ne jamais exposer le détail (PII / structure interne).
    console.error("[cancelByToken] error:", err);
    return { error: "SERVER" };
  }
}
