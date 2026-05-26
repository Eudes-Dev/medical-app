import { createElement } from "react";
import { sendEmail } from "./client";
import { PractitionerNotifyEmail } from "./templates/PractitionerNotifyEmail";

interface SendPractitionerNotifyParams {
  appointmentId: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  patientEmail?: string;
  appointmentDate: Date;
  appointmentType: string;
}

export async function sendPractitionerNotify(
  params: SendPractitionerNotifyParams
): Promise<void> {
  const to = process.env.PRACTITIONER_NOTIFICATION_EMAIL;
  if (!to) {
    console.error("[email:practitioner] PRACTITIONER_NOTIFICATION_EMAIL non configuré");
    return;
  }

  await sendEmail({
    to,
    subject: `Nouveau RDV — ${params.patientFirstName} ${params.patientLastName}`,
    react: createElement(PractitionerNotifyEmail, {
      patientFirstName: params.patientFirstName,
      patientLastName: params.patientLastName,
      patientPhone: params.patientPhone,
      patientEmail: params.patientEmail,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
    }),
    appointmentId: params.appointmentId,
    type: "PRACTITIONER_NOTIFY",
  });
}
