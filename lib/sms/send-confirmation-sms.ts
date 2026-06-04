/**
 * Helper d'envoi du SMS de confirmation de RDV (story 6.3).
 *
 * Le corps du SMS est court (≤160 caractères ciblé) pour rester sur 1 segment.
 * Si l'envoi SMS échoue et que `patient.email` est fourni, le helper bascule
 * automatiquement sur l'email de confirmation (fallback).
 *
 * @module lib/sms/send-confirmation-sms
 */

import { sendSms } from "./client";
import { sendConfirmationEmail } from "@/lib/email/send-confirmation";

interface SendConfirmationSmsParams {
  appointmentId: string;
  patientPhone: string; // E.164 — déjà validé par getPatientSmsTarget
  patientFirstName: string;
  patientEmail?: string | null;
  appointmentDate: Date;
  appointmentType: string;
  cancellationToken: string;
  cabinetSlug: string;
}

function formatShortDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(date);
}

export async function sendConfirmationSms(
  params: SendConfirmationSmsParams,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Story 8.1 : un seul lien de gestion pour rester ≤ 1 segment SMS (arbitrage
  // AC 10). La page `book/cancel` est le **hub** de gestion : elle propose à la
  // fois l'annulation ET la reprogrammation (« Reprogrammer plutôt »). Deux URLs
  // complètes (annuler + reprogrammer) dépasseraient 160 caractères.
  const manageUrl = `${appUrl}/${params.cabinetSlug}/book/cancel?token=${params.cancellationToken}`;
  const when = formatShortDateTime(params.appointmentDate);
  // « enregistré » (et non « confirmé ») : le RDV est créé en statut PENDING,
  // pas encore validé par le praticien (QA UX-001).
  const body = `Cabinet Médical : RDV enregistré le ${when}. Gérer mon RDV : ${manageUrl}`;

  await sendSms({
    to: params.patientPhone,
    body,
    appointmentId: params.appointmentId,
    type: "CONFIRMATION",
    fallbackEmail: params.patientEmail ?? undefined,
    fallbackEmailFactory: params.patientEmail
      ? () =>
          sendConfirmationEmail({
            appointmentId: params.appointmentId,
            patientEmail: params.patientEmail as string,
            patientFirstName: params.patientFirstName,
            appointmentDate: params.appointmentDate,
            appointmentType: params.appointmentType,
            cancellationToken: params.cancellationToken,
            cabinetSlug: params.cabinetSlug,
          })
      : undefined,
  });
}
