export type PatientsRange = "30j" | "90j";

export interface PatientsEvolutionPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Label affiché dans le tooltip (ex: "12 Mai 2026"). */
  label: string;
  totalRdv: number;
  nouveaux: number;
}

export interface TopTreatment {
  id: string;
  name: string;
  count: number;
}

export interface ActivityDay {
  /** Numéro du jour dans le mois (1-31). */
  day: number;
  /** Intensité de 0 à 4 (0 = aucune activité, 4 = saturé). */
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface ActivityMonth {
  /** Année calendaire. */
  year: number;
  /** Mois 1-12. */
  month: number;
  /** Jours du mois ordonnés. */
  days: ActivityDay[];
  /** Index 0-6 (lundi = 0) du premier jour du mois. */
  firstWeekday: number;
  /** Jour à mettre en évidence (today). */
  todayDay?: number;
}
