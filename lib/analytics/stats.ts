/**
 * Logique d'agrégation **pure** des statistiques du cabinet (story 10.1).
 *
 * Fonctions déterministes, **sans accès base, sans `server-only`, sans React** :
 * tout le calcul des indicateurs (chiffre d'affaires, fréquentation, nouveaux
 * patients, taux d'annulation, répartition par soin) est testable en isolation,
 * `now` étant injecté pour des fenêtres reproductibles.
 *
 * La couche d'accès `app/dashboard/analytics/analytics-data.ts` se contente de
 * charger Prisma puis de déléguer à `aggregateStatistics` — aucune règle de
 * calcul n'y est dupliquée (même séparation que `lib/waitlist/waitlist-utils.ts`
 * pour la story 8.5).
 *
 * @module lib/analytics/stats
 */

// ============================================================================
// Période
// ============================================================================

/** Fenêtre d'agrégation sélectionnable côté UI. */
export type StatsPeriod = "7d" | "30d" | "90d" | "12m";

/** Option de période (valeur + libellé FR), pour le sélecteur. */
export interface StatsPeriodOption {
  value: StatsPeriod;
  label: string;
}

/** Périodes proposées, dans l'ordre d'affichage. */
export const STATS_PERIODS: readonly StatsPeriodOption[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
] as const;

/** Période par défaut si `searchParams.period` est absent ou invalide. */
export const DEFAULT_STATS_PERIOD: StatsPeriod = "30d";

/** Garde de type : `value` est-il une `StatsPeriod` connue ? */
export function isStatsPeriod(value: unknown): value is StatsPeriod {
  return (
    value === "7d" || value === "30d" || value === "90d" || value === "12m"
  );
}

/** Normalise une valeur d'URL en `StatsPeriod` (défaut si invalide). */
export function parseStatsPeriod(value: unknown): StatsPeriod {
  return isStatsPeriod(value) ? value : DEFAULT_STATS_PERIOD;
}

/** Nombre de jours d'une période journalière (null pour la période mensuelle). */
const PERIOD_DAYS: Record<Exclude<StatsPeriod, "12m">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Bornes de la fenêtre courante et de la fenêtre précédente contiguë.
 *
 * - `end = now`.
 * - `7d/30d/90d` : `start = début de journée locale il y a (N-1) jours`
 *   (la fenêtre inclut aujourd'hui).
 * - `12m` : `start = 1er jour du mois, 11 mois en arrière` (12 mois calendaires
 *   incluant le mois courant).
 * - La fenêtre précédente a la **même durée**, est **immédiatement antérieure**
 *   et **ne chevauche pas** la courante (`prevEnd = start − 1 ms`).
 */
export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1, 0, 0, 0, 0);
}

export function resolvePeriodRange(
  period: StatsPeriod,
  now: Date,
): PeriodRange {
  const end = new Date(now);

  if (period === "12m") {
    const start = addMonths(startOfMonth(now), -11);
    const prevStart = addMonths(start, -12);
    const prevEnd = new Date(start.getTime() - 1);
    return { start, end, prevStart, prevEnd };
  }

  const days = PERIOD_DAYS[period];
  const start = startOfDay(addDays(now, -(days - 1)));
  const prevStart = startOfDay(addDays(start, -days));
  const prevEnd = new Date(start.getTime() - 1);
  return { start, end, prevStart, prevEnd };
}

// ============================================================================
// Agrégation
// ============================================================================

/** Statut d'un RDV (miroir de l'enum Prisma `AppointmentStatus`). */
export type StatAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

/**
 * Forme minimale d'un RDV pour l'agrégation. `price` est le tarif du soin
 * (`ServiceType.price`) déjà converti en nombre, ou `null` si le RDV n'a pas de
 * soin tarifé (RDV legacy sans `serviceTypeId`, ou soin sans prix).
 */
export interface StatAppointment {
  startTime: Date;
  status: StatAppointmentStatus;
  type: string;
  price: number | null;
}

/** Répartition des RDV par statut sur une fenêtre. */
export interface StatusBreakdown {
  PENDING: number;
  CONFIRMED: number;
  CANCELLED: number;
  COMPLETED: number;
}

/** Statistique d'un type de soin (libellé snapshot `Appointment.type`). */
export interface ServiceTypeStat {
  type: string;
  count: number;
  revenue: number;
}

/** Résultat agrégé, **sérialisable** (dates en ISO). */
export interface CabinetStatistics {
  period: StatsPeriod;
  range: { start: string; end: string };
  revenue: { value: number; trendPercent: number };
  appointments: {
    total: number;
    byStatus: StatusBreakdown;
    trendPercent: number;
  };
  newPatients: { value: number; trendPercent: number };
  cancellationRate: { value: number; trendPoints: number };
  byServiceType: ServiceTypeStat[];
}

export interface AggregateStatisticsInput {
  appointments: StatAppointment[];
  patients: { createdAt: Date }[];
  period: StatsPeriod;
  now: Date;
}

/**
 * Variation en pourcentage entier d'une valeur vs la précédente.
 * Règle identique à `overview-data.ts` : `prev = 0` → `0` si `curr = 0`,
 * sinon `100`.
 */
function pctTrend(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Arrondi à 1 décimale d'un taux en pourcentage. */
function rate1dp(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

interface WindowAccumulator {
  revenue: number;
  total: number;
  cancelled: number;
  byStatus: StatusBreakdown;
}

function newAccumulator(): WindowAccumulator {
  return {
    revenue: 0,
    total: 0,
    cancelled: 0,
    byStatus: { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 },
  };
}

function inWindow(t: Date, start: Date, end: Date): boolean {
  return t.getTime() >= start.getTime() && t.getTime() <= end.getTime();
}

function accumulate(acc: WindowAccumulator, appt: StatAppointment): void {
  acc.total += 1;
  acc.byStatus[appt.status] += 1;
  if (appt.status === "CANCELLED") acc.cancelled += 1;
  if (appt.status === "COMPLETED" && appt.price != null) {
    acc.revenue += appt.price;
  }
}

/**
 * Agrège les indicateurs du cabinet sur la fenêtre courante, avec tendances vs
 * la fenêtre précédente de même durée. Pure et déterministe (cf. en-tête module).
 */
export function aggregateStatistics(
  input: AggregateStatisticsInput,
): CabinetStatistics {
  const { appointments, patients, period, now } = input;
  const { start, end, prevStart, prevEnd } = resolvePeriodRange(period, now);

  const curr = newAccumulator();
  const prev = newAccumulator();

  // Répartition par type de soin (fenêtre courante, hors CANCELLED).
  const serviceCounts = new Map<string, { count: number; revenue: number }>();

  for (const appt of appointments) {
    if (inWindow(appt.startTime, start, end)) {
      accumulate(curr, appt);
      if (appt.status !== "CANCELLED") {
        const entry = serviceCounts.get(appt.type) ?? { count: 0, revenue: 0 };
        entry.count += 1;
        if (appt.status === "COMPLETED" && appt.price != null) {
          entry.revenue += appt.price;
        }
        serviceCounts.set(appt.type, entry);
      }
    } else if (inWindow(appt.startTime, prevStart, prevEnd)) {
      accumulate(prev, appt);
    }
  }

  let newPatientsCurr = 0;
  let newPatientsPrev = 0;
  for (const p of patients) {
    if (inWindow(p.createdAt, start, end)) newPatientsCurr += 1;
    else if (inWindow(p.createdAt, prevStart, prevEnd)) newPatientsPrev += 1;
  }

  const currCancelRate = rate1dp(curr.cancelled, curr.total);
  const prevCancelRate = rate1dp(prev.cancelled, prev.total);

  const byServiceType: ServiceTypeStat[] = [...serviceCounts.entries()]
    .map(([type, { count, revenue }]) => ({
      type,
      count,
      revenue: Math.round(revenue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  return {
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    revenue: {
      value: Math.round(curr.revenue * 100) / 100,
      trendPercent: pctTrend(curr.revenue, prev.revenue),
    },
    appointments: {
      total: curr.total,
      byStatus: curr.byStatus,
      trendPercent: pctTrend(curr.total, prev.total),
    },
    newPatients: {
      value: newPatientsCurr,
      trendPercent: pctTrend(newPatientsCurr, newPatientsPrev),
    },
    cancellationRate: {
      value: currCancelRate,
      trendPoints: Math.round(currCancelRate - prevCancelRate),
    },
    byServiceType,
  };
}
