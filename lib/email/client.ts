/**
 * Client email transactionnel (story 6.1, étendu en 6.3).
 *
 * Pattern fire-and-forget : le helper ne throw jamais.
 * Toute erreur est loggée dans MessageLog (channel EMAIL, status FAILED) et absorbée.
 *
 * @module lib/email/client
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { prisma } from "@/lib/prisma";
import type { MessageType } from "@/lib/generated/prisma/client";

let resendClient: Resend | null = null;

/**
 * Instancie le client Resend à la première utilisation (lazy).
 *
 * Évite l'instanciation au chargement du module : sans `RESEND_API_KEY`,
 * le constructeur Resend throw, ce qui ferait planter tout import transitif
 * (Server Actions, tests d'intégration) avant même l'exécution. La clé n'est
 * réellement requise qu'au moment de l'envoi. Aligné sur `lib/sms/client.ts`.
 */
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  appointmentId?: string;
  type: MessageType;
}

/**
 * Envoie un email transactionnel via Resend et log le résultat dans MessageLog.
 * Ne throw jamais — toute erreur est absorbée et loggée.
 */
export async function sendEmail({
  to,
  subject,
  react,
  appointmentId,
  type,
}: SendEmailOptions): Promise<void> {
  try {
    const from = process.env.EMAIL_FROM ?? "Cabinet Médical <noreply@cabinet.fr>";
    const html = await render(react);
    const { data, error } = await getResend().emails.send({ from, to, subject, html });

    if (error) {
      await prisma.messageLog.create({
        data: {
          appointmentId: appointmentId ?? null,
          channel: "EMAIL",
          to,
          type,
          status: "FAILED",
          error: error.message,
        },
      });
      console.error("[email] Resend error:", error);
      return;
    }

    await prisma.messageLog.create({
      data: {
        appointmentId: appointmentId ?? null,
        channel: "EMAIL",
        to,
        type,
        status: "SENT",
        providerMessageId: data?.id ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.messageLog
      .create({
        data: {
          appointmentId: appointmentId ?? null,
          channel: "EMAIL",
          to,
          type,
          status: "FAILED",
          error: message,
        },
      })
      .catch((logErr) => console.error("[email] MessageLog create failed:", logErr));
    console.error("[email] sendEmail unexpected error:", err);
  }
}
