import { prisma } from "@/lib/prisma";
import { sendReminderD1, sendReminderH2 } from "@/lib/email/send-reminder";
import { sendReminderD1Sms, sendReminderH2Sms } from "@/lib/sms/send-reminder-sms";
import { getPatientSmsTarget } from "@/lib/sms/phone";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowUtc = new Date();
  let sentD1 = 0;
  let sentH2 = 0;

  // --- Logique D-1 : uniquement à 17h UTC ---
  if (nowUtc.getUTCHours() === 17) {
    // Fenêtre "demain Paris" depuis 17h UTC : +7h = minuit CET, +31h = minuit CET+1j
    const windowStart = new Date(nowUtc.getTime() + 7 * 3_600_000);
    const windowEnd = new Date(nowUtc.getTime() + 31 * 3_600_000);

    const appointmentsD1 = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startTime: { gte: windowStart, lt: windowEnd },
        reminderD1SentAt: null,
        patient: { reminderOptOut: false },
      },
      include: { patient: true },
    });

    for (const appt of appointmentsD1) {
      const smsTarget = getPatientSmsTarget(appt.patient);
      const hasEmail = Boolean(appt.patient.email);

      // Au moins un canal doit être disponible pour considérer le rappel envoyé.
      if (!hasEmail && !smsTarget) continue;

      if (hasEmail) {
        void sendReminderD1({
          appointmentId: appt.id,
          patientEmail: appt.patient.email as string,
          patientFirstName: appt.patient.firstName,
          appointmentDate: appt.startTime,
          appointmentType: appt.type,
          optOutToken: appt.patient.optOutToken,
        }).catch((err) => console.error("[cron:reminder-d1]", err));
      }

      if (smsTarget) {
        void sendReminderD1Sms({
          appointmentId: appt.id,
          patientPhone: smsTarget,
          patientFirstName: appt.patient.firstName,
          appointmentDate: appt.startTime,
          optOutToken: appt.patient.optOutToken,
        }).catch((err) => console.error("[cron:sms-d1]", err));
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderD1SentAt: new Date() },
      });
      sentD1++;
    }
  }

  // --- Logique H-2 : fenêtre glissante [now+1h50, now+2h10] ---
  const h2WindowStart = new Date(nowUtc.getTime() + (2 * 60 - 10) * 60_000);
  const h2WindowEnd = new Date(nowUtc.getTime() + (2 * 60 + 10) * 60_000);

  const appointmentsH2 = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { gte: h2WindowStart, lte: h2WindowEnd },
      reminderH2SentAt: null,
      patient: { reminderOptOut: false },
    },
    include: { patient: true },
  });

  for (const appt of appointmentsH2) {
    const smsTarget = getPatientSmsTarget(appt.patient);
    const hasEmail = Boolean(appt.patient.email);

    if (!hasEmail && !smsTarget) continue;

    if (hasEmail) {
      void sendReminderH2({
        appointmentId: appt.id,
        patientEmail: appt.patient.email as string,
        patientFirstName: appt.patient.firstName,
        appointmentDate: appt.startTime,
        appointmentType: appt.type,
        optOutToken: appt.patient.optOutToken,
      }).catch((err) => console.error("[cron:reminder-h2]", err));
    }

    if (smsTarget) {
      void sendReminderH2Sms({
        appointmentId: appt.id,
        patientPhone: smsTarget,
        patientFirstName: appt.patient.firstName,
        appointmentDate: appt.startTime,
        optOutToken: appt.patient.optOutToken,
      }).catch((err) => console.error("[cron:sms-h2]", err));
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderH2SentAt: new Date() },
    });
    sentH2++;
  }

  return Response.json({ ok: true, sent: sentD1 + sentH2, sentD1, sentH2 });
}
