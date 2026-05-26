import { createElement } from "react";
import { sendEmail } from "./client";
import { ReminderD1Email } from "./templates/ReminderD1Email";
import { ReminderH2Email } from "./templates/ReminderH2Email";

interface SendReminderParams {
  appointmentId: string;
  patientEmail: string;
  patientFirstName: string;
  appointmentDate: Date;
  appointmentType: string;
  optOutToken: string;
}

export async function sendReminderD1(params: SendReminderParams): Promise<void> {
  await sendEmail({
    to: params.patientEmail,
    subject: "Rappel : votre rendez-vous de demain",
    react: createElement(ReminderD1Email, {
      patientFirstName: params.patientFirstName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      optOutToken: params.optOutToken,
    }),
    appointmentId: params.appointmentId,
    type: "REMINDER_D1",
  });
}

export async function sendReminderH2(params: SendReminderParams): Promise<void> {
  await sendEmail({
    to: params.patientEmail,
    subject: "Rappel : votre rendez-vous dans 2 heures",
    react: createElement(ReminderH2Email, {
      patientFirstName: params.patientFirstName,
      appointmentDate: params.appointmentDate,
      appointmentType: params.appointmentType,
      optOutToken: params.optOutToken,
    }),
    appointmentId: params.appointmentId,
    type: "REMINDER_H2",
  });
}
