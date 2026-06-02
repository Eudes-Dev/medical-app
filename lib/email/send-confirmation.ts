import { createElement } from "react";
import { sendEmail } from "./client";
import { getCabinetEmailInfo } from "./cabinet-info";
import { ConfirmationEmail } from "./templates/ConfirmationEmail";

interface SendConfirmationEmailParams {
  appointmentId: string;
  patientEmail: string;
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
  cancellationToken: string;
  cabinetSlug: string;
}

export async function sendConfirmationEmail(
  params: SendConfirmationEmailParams
): Promise<void> {
  const cabinet = await getCabinetEmailInfo();
  await sendEmail({
    to: params.patientEmail,
    subject: "Confirmation de votre rendez-vous",
    react: createElement(ConfirmationEmail, {
      patientFirstName: params.patientFirstName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      cancellationToken: params.cancellationToken,
      cabinetSlug: params.cabinetSlug,
      cabinet,
    }),
    appointmentId: params.appointmentId,
    type: "CONFIRMATION",
  });
}
