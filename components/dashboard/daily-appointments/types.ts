export type AppointmentStatus =
  | "completed"
  | "ongoing"
  | "confirmed"
  | "pending"
  | "cancelled";

export interface DailyAppointment {
  id: string;
  time: string;
  durationMin: number;
  patientName: string;
  patientEmail: string;
  patientAvatarUrl?: string;
  type: string;
  status: AppointmentStatus;
  /** Indique une téléconsultation, affiche l'action "Rejoindre". */
  isTeleconsultation?: boolean;
}
