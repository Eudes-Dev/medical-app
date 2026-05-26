import { createElement } from "react";
import { sendEmail } from "./client";
import { CancellationEmail } from "./templates/CancellationEmail";

interface SendCancellationEmailParams {
  appointmentId: string;
  patientEmail: string;
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
}

export async function sendCancellationEmail(
  params: SendCancellationEmailParams
): Promise<void> {
  await sendEmail({
    to: params.patientEmail,
    subject: "Annulation de votre rendez-vous",
    react: createElement(CancellationEmail, {
      patientFirstName: params.patientFirstName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
    }),
    appointmentId: params.appointmentId,
    type: "CANCELLATION",
  });
}
