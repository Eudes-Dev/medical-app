/**
 * Helpers d'envoi des SMS de rappel (J-1 et H-2) — story 6.3.
 *
 * Les rappels SMS sont envoyés **en complément** de l'email de rappel
 * (AC 2). Chaque SMS porte un lien d'opt-out (STOP) pour rester cohérent
 * avec la stratégie de désinscription de la story 6.2 (CNIL / consentement).
 *
 * Pas de fallback email côté SMS — l'email de rappel est déjà envoyé en
 * parallèle dans la route cron.
 *
 * @module lib/sms/send-reminder-sms
 */

import { sendSms } from "./client";

interface SendReminderSmsParams {
  appointmentId: string;
  patientPhone: string; // E.164
  patientFirstName: string;
  appointmentDate: Date;
  /** Token d'opt-out — alimente le lien de désinscription (STOP) du SMS. */
  optOutToken: string;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

/** Lien de désinscription des rappels (route publique `/unsubscribe`, story 6.2). */
function optOutUrl(optOutToken: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${appUrl}/unsubscribe?token=${optOutToken}`;
}

export async function sendReminderD1Sms(
  params: SendReminderSmsParams,
): Promise<void> {
  const time = formatTime(params.appointmentDate);
  const body = `Rappel ${params.patientFirstName} : RDV demain à ${time} au Cabinet Médical. Stop rappels : ${optOutUrl(params.optOutToken)}`;

  await sendSms({
    to: params.patientPhone,
    body,
    appointmentId: params.appointmentId,
    type: "REMINDER_D1",
  });
}

export async function sendReminderH2Sms(
  params: SendReminderSmsParams,
): Promise<void> {
  const time = formatTime(params.appointmentDate);
  const body = `Rappel ${params.patientFirstName} : RDV dans 2h (${time}) au Cabinet Médical. Stop rappels : ${optOutUrl(params.optOutToken)}`;

  await sendSms({
    to: params.patientPhone,
    body,
    appointmentId: params.appointmentId,
    type: "REMINDER_H2",
  });
}
