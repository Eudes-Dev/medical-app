import { CalendarClock, FileText, Users } from "lucide-react";

import type { AlertItem, Consultation, ConsultationRange } from "./types";

export const DEFAULT_ALERTS: AlertItem[] = [
  {
    id: "rdv-confirm",
    title: "RDV à confirmer",
    description: "3 demandes en ligne",
    tone: "warning",
    icon: <CalendarClock />,
    count: 3,
  },
  {
    id: "waitlist",
    title: "Liste d'attente",
    description: "1 patient prioritaire",
    tone: "primary",
    icon: <Users />,
    count: 1,
  },
  {
    id: "documents",
    title: "Documents requis",
    description: "Résultats labo manquants",
    tone: "danger",
    icon: <FileText />,
  },
];

const TODAY: Consultation[] = [
  {
    id: "c1",
    time: "09:00",
    durationMin: 30,
    patientName: "Marie Dubois",
    reason: "Bilan annuel",
    status: "scheduled",
    kind: "in-person",
  },
  {
    id: "c2",
    time: "09:30",
    durationMin: 30,
    patientName: "Jacques Leroy",
    reason: "Téléconsultation en cours",
    status: "live",
    kind: "teleconsultation",
  },
  {
    id: "c3",
    time: "10:15",
    durationMin: 45,
    patientName: "Thomas Richard",
    reason: "Consultation suivi",
    status: "confirmed",
    kind: "in-person",
  },
  {
    id: "c4",
    time: "11:00",
    durationMin: 30,
    patientName: "Sophie Auger",
    reason: "À confirmer",
    status: "pending",
    kind: "in-person",
  },
];

const TOMORROW: Consultation[] = [
  {
    id: "t1",
    time: "08:30",
    durationMin: 30,
    patientName: "Léa Martin",
    reason: "Consultation initiale",
    status: "confirmed",
    kind: "in-person",
  },
  {
    id: "t2",
    time: "10:00",
    durationMin: 45,
    patientName: "Paul Bernard",
    reason: "Téléconsultation suivi",
    status: "scheduled",
    kind: "teleconsultation",
  },
  {
    id: "t3",
    time: "14:00",
    durationMin: 30,
    patientName: "Camille Roy",
    reason: "À confirmer",
    status: "pending",
    kind: "in-person",
  },
];

const WEEK: Consultation[] = [
  ...TODAY.slice(0, 2),
  ...TOMORROW.slice(0, 2),
  {
    id: "w1",
    time: "Jeu. 09:00",
    durationMin: 30,
    patientName: "Antoine Petit",
    reason: "Bilan",
    status: "confirmed",
    kind: "in-person",
  },
];

export const DEFAULT_CONSULTATIONS: Record<ConsultationRange, Consultation[]> = {
  today: TODAY,
  tomorrow: TOMORROW,
  week: WEEK,
};
