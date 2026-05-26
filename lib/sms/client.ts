/**
 * Client SMS transactionnel via Twilio (story 6.3).
 *
 * Pattern fire-and-forget : le helper ne throw jamais.
 * Toute erreur est loggée dans MessageLog (channel SMS, status FAILED) et absorbée.
 *
 * Toggle global via `SMS_ENABLED=true|false`. Quand `false`, le helper retourne
 * immédiatement sans appel Twilio (no-op).
 *
 * Fallback : si l'envoi SMS échoue et qu'un `fallbackEmailFactory` est fourni,
 * il est invoqué pour basculer sur le canal email. Le factory est injecté
 * (et non importé) pour éviter le couplage circulaire avec `lib/email/*`.
 *
 * @module lib/sms/client
 */

import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import type { MessageType } from "@/lib/generated/prisma/client";

let twilioClient: ReturnType<typeof twilio> | null = null;

/** Instancie le client Twilio à la première utilisation (lazy). */
function getTwilioClient(): ReturnType<typeof twilio> {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return twilioClient;
}

interface SendSmsOptions {
  /** Numéro destinataire en E.164 (ex: "+33612345678"). */
  to: string;
  /** Corps du SMS (idéalement ≤160 caractères pour 1 segment). */
  body: string;
  /** ID du rendez-vous concerné (pour traçabilité). */
  appointmentId?: string;
  /** Type de message (CONFIRMATION, REMINDER_D1, REMINDER_H2, …). */
  type: MessageType;
  /** Email de fallback à utiliser si l'envoi SMS échoue. */
  fallbackEmail?: string;
  /** Factory exécuté en cas d'échec SMS si `fallbackEmail` est défini. */
  fallbackEmailFactory?: () => Promise<void>;
}

/**
 * Envoie un SMS via Twilio et log le résultat dans MessageLog.
 * Ne throw jamais — toute erreur est absorbée et loggée.
 *
 * Si `SMS_ENABLED !== "true"` → no-op (return immédiat sans erreur).
 */
export async function sendSms({
  to,
  body,
  appointmentId,
  type,
  fallbackEmail,
  fallbackEmailFactory,
}: SendSmsOptions): Promise<void> {
  if (process.env.SMS_ENABLED !== "true") return;

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.error("[sms] TWILIO_PHONE_NUMBER non configuré — abandon de l'envoi");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookSecret = process.env.TWILIO_STATUS_WEBHOOK_SECRET ?? "";
  const statusCallback = appUrl && webhookSecret
    ? `${appUrl}/api/webhooks/twilio/status?secret=${encodeURIComponent(webhookSecret)}`
    : undefined;

  try {
    const message = await getTwilioClient().messages.create({
      to,
      from,
      body,
      ...(statusCallback ? { statusCallback } : {}),
    });

    await prisma.messageLog.create({
      data: {
        appointmentId: appointmentId ?? null,
        channel: "SMS",
        to,
        type,
        status: "SENT",
        providerMessageId: message.sid,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.messageLog
      .create({
        data: {
          appointmentId: appointmentId ?? null,
          channel: "SMS",
          to,
          type,
          status: "FAILED",
          error: errMsg,
        },
      })
      .catch((logErr) => console.error("[sms] MessageLog create failed:", logErr));

    console.error("[sms] send failed:", errMsg);

    if (fallbackEmail && fallbackEmailFactory) {
      try {
        await fallbackEmailFactory();
      } catch (fallbackErr) {
        console.error("[sms:fallback-email]", fallbackErr);
      }
    }
  }
}
