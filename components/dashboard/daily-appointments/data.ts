import type { DailyAppointment } from "./types";

export const DEFAULT_DAILY_APPOINTMENTS: DailyAppointment[] = [
  {
    id: "rdv-09-00",
    time: "09:00",
    durationMin: 30,
    patientName: "Marie Dubois",
    patientEmail: "m.dubois@mail.com",
    type: "Bilan annuel",
    status: "completed",
  },
  {
    id: "rdv-09-30",
    time: "09:30",
    durationMin: 20,
    patientName: "Jacques Leroy",
    patientEmail: "j.leroy@mail.com",
    type: "Téléconsultation",
    status: "ongoing",
    isTeleconsultation: true,
  },
  {
    id: "rdv-10-15",
    time: "10:15",
    durationMin: 45,
    patientName: "Thomas Richard",
    patientEmail: "trichard@pro.fr",
    type: "Consultation suivi",
    status: "confirmed",
  },
  {
    id: "rdv-11-00",
    time: "11:00",
    durationMin: 30,
    patientName: "Sophie Auger",
    patientEmail: "s.auger@mail.com",
    type: "Première consultation",
    status: "pending",
  },
];

/** Total fictif pour illustrer la pagination. */
export const DEFAULT_DAILY_TOTAL = 18;
