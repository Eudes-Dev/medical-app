/**
 * Module serveur d'agrégation des données du dashboard d'accueil.
 *
 * Fournit `getDashboardOverview()` consommé par `app/dashboard/page.tsx`
 * (Server Component). Toutes les données retournées sont sérialisables
 * (aucun nœud React). La page de dashboard est responsable d'attacher
 * les icônes côté serveur lors de la composition des props.
 *
 * @module app/dashboard/overview-data
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ActivityDay,
  ActivityMonth,
  PatientsEvolutionPoint,
  PatientsRange,
  TopTreatment,
} from "@/components/dashboard/activity-overview";
import type {
  Consultation,
  ConsultationKind,
  ConsultationRange,
  ConsultationStatus,
} from "@/components/dashboard/today-overview";
import type {
  AppointmentStatus as UiAppointmentStatus,
  DailyAppointment,
} from "@/components/dashboard/daily-appointments";

// ============================================================================
// Types publics
// ============================================================================

export interface DashboardKpis {
  /** RDV aujourd'hui */
  rdvToday: {
    value: number;
    capacity: number;
    sparkline: { label: string; value: number }[];
    trendPercent: number;
  };
  /** Nouveaux patients sur 7 jours */
  newPatients: {
    value: number;
    sparkline: { label: string; value: number }[];
    trendDelta: number;
  };
  /** Taux de remplissage du jour */
  fillRate: {
    value: number; // pourcentage entier
    sparkline: { label: string; value: number }[];
    trendPercent: number;
  };
  /** No-shows sur 30 jours */
  noShows: {
    value: number; // pourcentage à 1 décimale
    sparkline: { label: string; value: number }[];
    trendPercent: number;
  };
}

export interface DashboardAlerts {
  pendingCount: number;
  todayCancelledCount: number;
  upcomingTeleconsultationCount: number;
}

export interface DashboardOverviewData {
  kpis: DashboardKpis;
  alerts: DashboardAlerts;
  consultations: Record<ConsultationRange, Consultation[]>;
  patientsEvolution: Record<PatientsRange, PatientsEvolutionPoint[]>;
  topTreatments: TopTreatment[];
  activityMonth: ActivityMonth;
  dailyAppointments: {
    items: DailyAppointment[];
    total: number;
  };
}

// ============================================================================
// Helpers temporels
// ============================================================================

/** Capacité quotidienne théorique pour le calcul du taux de remplissage. */
const DAILY_SLOT_CAPACITY = 20;

const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"]; // index = getDay() (0=dim)
const MONTH_LABELS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
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

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isoDateKey(d: Date): string {
  // YYYY-MM-DD en local
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pctTrend(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

// ============================================================================
// Agrégateurs
// ============================================================================

interface AppointmentLite {
  startTime: Date;
  endTime: Date;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  type: string;
}

interface AppointmentFull extends AppointmentLite {
  id: string;
  patient: { firstName: string; lastName: string; email: string | null };
}

function isTeleconsultationType(type: string): boolean {
  return type.toLowerCase().includes("téléconsultation") ||
    type.toLowerCase().includes("teleconsultation");
}

function mapToConsultationStatus(
  appt: AppointmentLite,
  now: Date,
): ConsultationStatus {
  if (
    appt.status === "CONFIRMED" &&
    appt.startTime <= now &&
    appt.endTime >= now
  ) {
    return "live";
  }
  if (appt.status === "PENDING") return "pending";
  if (appt.status === "CONFIRMED") return "confirmed";
  return "scheduled";
}

function mapToUiAppointmentStatus(
  appt: AppointmentLite,
  now: Date,
): UiAppointmentStatus {
  if (appt.status === "CANCELLED") return "cancelled";
  if (appt.status === "COMPLETED") return "completed";
  if (
    appt.status === "CONFIRMED" &&
    appt.startTime <= now &&
    appt.endTime >= now
  ) {
    return "ongoing";
  }
  if (appt.status === "PENDING") return "pending";
  return "confirmed";
}

function formatTimeHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function buildConsultation(appt: AppointmentFull, now: Date): Consultation {
  const kind: ConsultationKind = isTeleconsultationType(appt.type)
    ? "teleconsultation"
    : "in-person";
  return {
    id: appt.id,
    time: formatTimeHHMM(appt.startTime),
    durationMin: durationMinutes(appt.startTime, appt.endTime),
    patientName: `${appt.patient.firstName} ${appt.patient.lastName}`.trim(),
    reason: appt.type,
    status: mapToConsultationStatus(appt, now),
    kind,
  };
}

function buildDailyAppointment(
  appt: AppointmentFull,
  now: Date,
): DailyAppointment {
  return {
    id: appt.id,
    time: formatTimeHHMM(appt.startTime),
    durationMin: durationMinutes(appt.startTime, appt.endTime),
    patientName: `${appt.patient.firstName} ${appt.patient.lastName}`.trim(),
    patientEmail: appt.patient.email ?? "—",
    type: appt.type,
    status: mapToUiAppointmentStatus(appt, now),
    isTeleconsultation: isTeleconsultationType(appt.type),
  };
}

// ============================================================================
// Entrée principale
// ============================================================================

/**
 * Récupère et agrège toutes les données affichées sur le dashboard d'accueil.
 *
 * Stratégie : on charge en bloc les fenêtres utiles (90 jours pour les graphes,
 * mois courant pour la heatmap, journée pour la table) puis on agrège en mémoire
 * afin de limiter les allers-retours DB.
 */
export async function getDashboardOverview(): Promise<DashboardOverviewData> {
  const now = new Date();
  const today0 = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fenêtres utiles
  const last7Start = startOfDay(addDays(now, -6));
  const last30Start = startOfDay(addDays(now, -29));
  const last90Start = startOfDay(addDays(now, -89));
  const prev30Start = startOfDay(addDays(now, -59));
  const prev30End = endOfDay(addDays(now, -30));
  const last49Start = startOfDay(addDays(now, -48)); // 7 semaines
  const prev7Start = startOfDay(addDays(now, -13));
  const prev7End = endOfDay(addDays(now, -7));
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekEnd = endOfDay(addDays(today0, 6));
  const tomorrowStart = startOfDay(addDays(now, 1));
  const tomorrowEnd = endOfDay(addDays(now, 1));

  // Fenêtre maximale couvrant tout ce qu'on aggrégera côté apointments.
  const earliest = last90Start < prev30Start ? last90Start : prev30Start;
  const apptsWindowStart = earliest < last49Start ? earliest : last49Start;
  const apptsWindowEnd = weekEnd > monthEnd ? weekEnd : monthEnd;

  const [
    apptsInWindow,
    patientsRecent,
    pendingFutureCount,
    todayAppointmentsRaw,
    weekAppointmentsRaw,
    tomorrowAppointmentsRaw,
    upcomingTeleCount,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startTime: { gte: apptsWindowStart, lte: apptsWindowEnd },
      },
      select: { startTime: true, endTime: true, status: true, type: true },
    }),
    prisma.patient.findMany({
      where: { createdAt: { gte: last49Start } },
      select: { createdAt: true },
    }),
    prisma.appointment.count({
      where: { status: "PENDING", startTime: { gte: now } },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: today0, lte: todayEnd } },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        startTime: { gte: today0, lte: weekEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 8,
    }),
    prisma.appointment.findMany({
      where: {
        startTime: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        patient: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.count({
      where: {
        startTime: { gte: now, lte: weekEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
        type: { contains: "éléconsultation" },
      },
    }),
  ]);

  // -------------------- KPI 1 : RDV aujourd'hui --------------------
  const rdvTodayCount = todayAppointmentsRaw.filter(
    (a) => a.status !== "CANCELLED",
  ).length;

  // Sparkline 7 derniers jours
  const rdvByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    rdvByDay.set(isoDateKey(addDays(today0, -i)), 0);
  }
  for (const a of apptsInWindow) {
    if (a.status === "CANCELLED") continue;
    const key = isoDateKey(a.startTime);
    if (rdvByDay.has(key)) rdvByDay.set(key, (rdvByDay.get(key) ?? 0) + 1);
  }
  const rdvSparkline: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today0, -i);
    rdvSparkline.push({
      label: WEEKDAY_LETTERS[d.getDay()],
      value: rdvByDay.get(isoDateKey(d)) ?? 0,
    });
  }

  // Tendance : aujourd'hui vs jour équivalent semaine passée
  const sameDayLastWeek = rdvByDay.get(isoDateKey(addDays(today0, -7))) ?? 0;
  const rdvTrendPercent = pctTrend(rdvTodayCount, sameDayLastWeek);

  // -------------------- KPI 2 : Nouveaux patients (7j) --------------------
  const newPatientsByWeek: number[] = [0, 0, 0, 0, 0, 0, 0];
  // Index 6 = semaine la plus récente (J-6 → aujourd'hui), 0 = J-48 → J-42
  for (const p of patientsRecent) {
    const daysAgo = Math.floor(
      (today0.getTime() - startOfDay(p.createdAt).getTime()) / 86400000,
    );
    if (daysAgo < 0 || daysAgo >= 49) continue;
    const weekIndex = 6 - Math.floor(daysAgo / 7);
    if (weekIndex >= 0 && weekIndex < 7) newPatientsByWeek[weekIndex]++;
  }
  const newPatientsSparkline = newPatientsByWeek.map((v, i) => ({
    label: `S${i + 1}`,
    value: v,
  }));
  const newPatientsValue = newPatientsByWeek[6];
  const newPatientsTrendDelta = newPatientsValue - newPatientsByWeek[5];

  // -------------------- KPI 3 : Taux de remplissage --------------------
  const todayFilled = todayAppointmentsRaw.filter(
    (a) => a.status === "CONFIRMED" || a.status === "COMPLETED",
  ).length;
  const fillRateValue = Math.min(
    100,
    Math.round((todayFilled / DAILY_SLOT_CAPACITY) * 100),
  );

  const fillSparkline: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today0, -i);
    const filled = apptsInWindow.filter(
      (a) =>
        isoDateKey(a.startTime) === isoDateKey(d) &&
        (a.status === "CONFIRMED" || a.status === "COMPLETED"),
    ).length;
    fillSparkline.push({
      label: WEEKDAY_LETTERS[d.getDay()],
      value: Math.min(
        100,
        Math.round((filled / DAILY_SLOT_CAPACITY) * 100),
      ),
    });
  }
  const fillRateTrendPercent =
    fillSparkline.length >= 2
      ? fillSparkline[fillSparkline.length - 1].value -
        fillSparkline[fillSparkline.length - 2].value
      : 0;

  // -------------------- KPI 4 : No-shows 30j --------------------
  const apptsLast30 = apptsInWindow.filter(
    (a) => a.startTime >= last30Start && a.startTime <= todayEnd,
  );
  const cancelledLast30 = apptsLast30.filter(
    (a) => a.status === "CANCELLED",
  ).length;
  const noShowsValue =
    apptsLast30.length === 0
      ? 0
      : Math.round((cancelledLast30 / apptsLast30.length) * 1000) / 10;

  const apptsPrev30 = apptsInWindow.filter(
    (a) => a.startTime >= prev30Start && a.startTime <= prev30End,
  );
  const cancelledPrev30 = apptsPrev30.filter(
    (a) => a.status === "CANCELLED",
  ).length;
  const noShowsPrev =
    apptsPrev30.length === 0
      ? 0
      : Math.round((cancelledPrev30 / apptsPrev30.length) * 1000) / 10;

  // Sparkline : taux par semaine sur 7 semaines
  const noShowsSparkline: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const weekEndD = endOfDay(addDays(today0, -i * 7));
    const weekStartD = startOfDay(addDays(weekEndD, -6));
    const weekAppts = apptsInWindow.filter(
      (a) => a.startTime >= weekStartD && a.startTime <= weekEndD,
    );
    const weekCancelled = weekAppts.filter(
      (a) => a.status === "CANCELLED",
    ).length;
    const rate =
      weekAppts.length === 0
        ? 0
        : Math.round((weekCancelled / weekAppts.length) * 1000) / 10;
    noShowsSparkline.push({ label: `S${7 - i}`, value: rate });
  }
  const noShowsTrendPercent = Math.round(noShowsValue - noShowsPrev);

  const kpis: DashboardKpis = {
    rdvToday: {
      value: rdvTodayCount,
      capacity: DAILY_SLOT_CAPACITY,
      sparkline: rdvSparkline,
      trendPercent: rdvTrendPercent,
    },
    newPatients: {
      value: newPatientsValue,
      sparkline: newPatientsSparkline,
      trendDelta: newPatientsTrendDelta,
    },
    fillRate: {
      value: fillRateValue,
      sparkline: fillSparkline,
      trendPercent: fillRateTrendPercent,
    },
    noShows: {
      value: noShowsValue,
      sparkline: noShowsSparkline,
      trendPercent: noShowsTrendPercent,
    },
  };

  // -------------------- Alertes --------------------
  const alerts: DashboardAlerts = {
    pendingCount: pendingFutureCount,
    todayCancelledCount: todayAppointmentsRaw.filter(
      (a) => a.status === "CANCELLED",
    ).length,
    upcomingTeleconsultationCount: upcomingTeleCount,
  };

  // -------------------- Consultations (today/tomorrow/week) --------------------
  const todayConsultations = todayAppointmentsRaw
    .filter((a) => a.status !== "CANCELLED" && a.status !== "COMPLETED")
    .map((a) => buildConsultation(a, now))
    .slice(0, 6);

  const tomorrowConsultations = tomorrowAppointmentsRaw
    .map((a) => buildConsultation(a, now))
    .slice(0, 6);

  const weekConsultations = weekAppointmentsRaw
    .map((a) => {
      const c = buildConsultation(a, now);
      // Préfixer le jour court pour les RDV après aujourd'hui
      const apptDay = startOfDay(a.startTime);
      if (apptDay.getTime() !== today0.getTime()) {
        const dayShort = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."][
          a.startTime.getDay()
        ];
        c.time = `${dayShort} ${c.time}`;
      }
      return c;
    })
    .slice(0, 6);

  const consultations: Record<ConsultationRange, Consultation[]> = {
    today: todayConsultations,
    tomorrow: tomorrowConsultations,
    week: weekConsultations,
  };

  // -------------------- Évolution patients (30j / 90j) --------------------
  const newPatientsAll = await prisma.patient.findMany({
    where: { createdAt: { gte: last90Start } },
    select: { createdAt: true },
  });

  function buildEvolution(days: number): PatientsEvolutionPoint[] {
    const out: PatientsEvolutionPoint[] = [];
    const totalByDay = new Map<string, number>();
    const newByDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const key = isoDateKey(addDays(today0, -i));
      totalByDay.set(key, 0);
      newByDay.set(key, 0);
    }
    for (const a of apptsInWindow) {
      if (a.status === "CANCELLED") continue;
      const key = isoDateKey(a.startTime);
      if (totalByDay.has(key)) totalByDay.set(key, (totalByDay.get(key) ?? 0) + 1);
    }
    for (const p of newPatientsAll) {
      const key = isoDateKey(p.createdAt);
      if (newByDay.has(key)) newByDay.set(key, (newByDay.get(key) ?? 0) + 1);
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today0, -i);
      const key = isoDateKey(d);
      out.push({
        date: key,
        label: `${d.getDate()} ${MONTH_LABELS_FR[d.getMonth()]} ${d.getFullYear()}`,
        totalRdv: totalByDay.get(key) ?? 0,
        nouveaux: newByDay.get(key) ?? 0,
      });
    }
    return out;
  }

  const patientsEvolution: Record<PatientsRange, PatientsEvolutionPoint[]> = {
    "30j": buildEvolution(30),
    "90j": buildEvolution(90),
  };

  // -------------------- Top soins (30j) --------------------
  const treatmentCounts = new Map<string, number>();
  for (const a of apptsLast30) {
    if (a.status === "CANCELLED") continue;
    treatmentCounts.set(a.type, (treatmentCounts.get(a.type) ?? 0) + 1);
  }
  const topTreatments: TopTreatment[] = [...treatmentCounts.entries()]
    .map(([name, count]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // -------------------- Heatmap mois courant --------------------
  const countsByDayOfMonth = new Map<number, number>();
  for (const a of apptsInWindow) {
    if (a.status === "CANCELLED") continue;
    if (a.startTime < monthStart || a.startTime > monthEnd) continue;
    const d = a.startTime.getDate();
    countsByDayOfMonth.set(d, (countsByDayOfMonth.get(d) ?? 0) + 1);
  }
  const daysInMonth = monthEnd.getDate();
  const maxCount = Math.max(1, ...Array.from(countsByDayOfMonth.values()));
  const days: ActivityDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const c = countsByDayOfMonth.get(d) ?? 0;
    const ratio = c / maxCount;
    let intensity: ActivityDay["intensity"] = 0;
    if (c === 0) intensity = 0;
    else if (ratio < 0.25) intensity = 1;
    else if (ratio < 0.5) intensity = 2;
    else if (ratio < 0.85) intensity = 3;
    else intensity = 4;
    days.push({ day: d, intensity });
  }
  // firstWeekday : Lundi = 0
  const jsDay = monthStart.getDay(); // 0=dim ... 6=sam
  const firstWeekday = (jsDay + 6) % 7;
  const activityMonth: ActivityMonth = {
    year: monthStart.getFullYear(),
    month: monthStart.getMonth() + 1,
    firstWeekday,
    todayDay: now.getDate(),
    days,
  };

  // -------------------- Daily appointments table --------------------
  const dailyItems = todayAppointmentsRaw.map((a) =>
    buildDailyAppointment(a, now),
  );

  return {
    kpis,
    alerts,
    consultations,
    patientsEvolution,
    topTreatments,
    activityMonth,
    dailyAppointments: {
      items: dailyItems,
      total: dailyItems.length,
    },
  };
}
