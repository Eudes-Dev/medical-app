import { createElement } from "react";
import { sendEmail } from "./client";
import { getCabinetEmailInfo } from "./cabinet-info";
import { RescheduleEmail } from "./templates/RescheduleEmail";

interface SendRescheduleEmailParams {
  appointmentId: string;
  patientEmail: string;
  patientFirstName: string;
  /** Nouvelle date/heure du rendez-vous. */
  appointmentDate: Date;
  appointmentType: string;
  /** Jeton de gestion opaque (réutilise `cancellationToken`, story 6.1/8.1). */
  cancellationToken: string;
  cabinetSlug: string;
}

export async function sendRescheduleEmail(
  params: SendRescheduleEmailParams,
): Promise<void> {
  const cabinet = await getCabinetEmailInfo();
  await sendEmail({
    to: params.patientEmail,
    subject: "Votre rendez-vous a été reprogrammé",
    react: createElement(RescheduleEmail, {
      patientFirstName: params.patientFirstName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      cancellationToken: params.cancellationToken,
      cabinetSlug: params.cabinetSlug,
      cabinet,
    }),
    appointmentId: params.appointmentId,
    type: "RESCHEDULED",
  });
}
