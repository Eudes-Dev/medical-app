import type {
  ActivityMonth,
  PatientsEvolutionPoint,
  PatientsRange,
  TopTreatment,
} from "./types";

const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

function buildPatientsSeries(days: number): PatientsEvolutionPoint[] {
  const today = new Date(2026, 4, 16); // 16 Mai 2026 (déterministe)
  const out: PatientsEvolutionPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Forme sinusoïdale pour un rendu organique et déterministe.
    const t = (days - 1 - i) / Math.max(days - 1, 1);
    const totalBase = 18 + Math.sin(t * Math.PI * 2) * 6 + Math.cos(t * Math.PI * 4) * 2;
    const newBase = 5 + Math.sin(t * Math.PI * 2 + 1) * 3 + Math.cos(t * Math.PI * 3) * 1.5;
    const date = d.toISOString().slice(0, 10);
    const label = `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    out.push({
      date,
      label,
      totalRdv: Math.max(0, Math.round(totalBase)),
      nouveaux: Math.max(0, Math.round(newBase)),
    });
  }
  return out;
}

export const DEFAULT_PATIENTS_EVOLUTION: Record<
  PatientsRange,
  PatientsEvolutionPoint[]
> = {
  "30j": buildPatientsSeries(30),
  "90j": buildPatientsSeries(90),
};

export const DEFAULT_TOP_TREATMENTS: TopTreatment[] = [
  { id: "consult-gen", name: "Consultation Générale", count: 142 },
  { id: "bilan", name: "Bilan Annuel", count: 84 },
  { id: "ordo", name: "Renouvellement Ordo.", count: 45 },
  { id: "vaccin", name: "Vaccination", count: 28 },
];

/**
 * Activité du mois de Mai 2026 (déterministe).
 * Intensités calibrées pour ressembler à une charge de cabinet réaliste.
 */
export const DEFAULT_ACTIVITY_MONTH: ActivityMonth = {
  year: 2026,
  month: 5,
  // Mai 2026 commence un vendredi -> index 4 (lun=0).
  firstWeekday: 4,
  todayDay: 16,
  days: [
    { day: 1, intensity: 0 },
    { day: 2, intensity: 0 },
    { day: 3, intensity: 0 },
    { day: 4, intensity: 2 },
    { day: 5, intensity: 3 },
    { day: 6, intensity: 2 },
    { day: 7, intensity: 4 },
    { day: 8, intensity: 3 },
    { day: 9, intensity: 0 },
    { day: 10, intensity: 0 },
    { day: 11, intensity: 2 },
    { day: 12, intensity: 3 },
    { day: 13, intensity: 1 },
    { day: 14, intensity: 4 },
    { day: 15, intensity: 2 },
    { day: 16, intensity: 3 },
    { day: 17, intensity: 0 },
    { day: 18, intensity: 2 },
    { day: 19, intensity: 1 },
    { day: 20, intensity: 3 },
    { day: 21, intensity: 2 },
    { day: 22, intensity: 4 },
    { day: 23, intensity: 1 },
    { day: 24, intensity: 0 },
    { day: 25, intensity: 2 },
    { day: 26, intensity: 3 },
    { day: 27, intensity: 1 },
    { day: 28, intensity: 2 },
    { day: 29, intensity: 3 },
    { day: 30, intensity: 1 },
    { day: 31, intensity: 0 },
  ],
};

export const MONTH_LABELS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
