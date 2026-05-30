/**
 * Helpers de fuseau horaire du cabinet (`Europe/Paris`) — story 5.3 (REL-001).
 *
 * Problème résolu : la génération de créneaux et toutes les extractions
 * « heure/jour » s'appuyaient sur le fuseau **local du process**. En production
 * (Vercel = UTC), un créneau configuré « 10:00 » était posé à 10:00 UTC, soit
 * 12:00 heure de Paris en été — des rendez-vous décalés.
 *
 * Ce module centralise la conversion via `date-fns-tz` (instants) et `Intl`
 * (extraction), en s'appuyant sur {@link CABINET_TIMEZONE}. Toutes les fonctions
 * sont **indépendantes du fuseau du serveur** : elles gèrent automatiquement
 * CET (UTC+1, hiver) et CEST (UTC+2, été).
 *
 * @module lib/cabinet/timezone
 */

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { CABINET_TIMEZONE } from "@/lib/cabinet/config";

const pad = (n: number): string => String(n).padStart(2, "0");

/** Champs « horloge murale » d'un instant exprimés dans le fuseau du cabinet. */
interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
}

const PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: CABINET_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Décompose un instant en champs horloge-murale du fuseau cabinet. */
function zonedParts(date: Date): ZonedParts {
  const parts = PARTS_FORMATTER.formatToParts(date);
  const get = (t: string): number =>
    Number(parts.find((p) => p.type === t)?.value);
  // `en-CA` peut renvoyer "24" pour minuit selon le runtime — normaliser.
  const hour = get("hour") % 24;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  };
}

/**
 * Clé calendaire `YYYYMMDD` (entier) du **jour de Paris** d'un instant.
 * Remplace l'extraction `getFullYear/getMonth/getDate` (fuseau serveur).
 */
export function zonedDayKey(date: Date): number {
  const { year, month, day } = zonedParts(date);
  return year * 10000 + (month - 1) * 100 + day;
}

/**
 * Minutes écoulées depuis minuit **heure de Paris** pour un instant donné.
 * Remplace `date.getHours() * 60 + date.getMinutes()` (fuseau serveur).
 */
export function zonedMinutes(date: Date): number {
  const { hour, minute } = zonedParts(date);
  return hour * 60 + minute;
}

/**
 * Jour de la semaine **heure de Paris** (0 = dimanche … 6 = samedi),
 * aligné sur la convention `WorkingHours.dayOfWeek`. Remplace `date.getDay()`.
 */
export function zonedDayOfWeek(date: Date): number {
  // On reconstruit un instant à midi Paris du jour ciblé, puis on lit le
  // jour de semaine via Intl (insensible au fuseau serveur).
  const dayStr = formatInTimeZone(date, CABINET_TIMEZONE, "yyyy-MM-dd");
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CABINET_TIMEZONE,
    weekday: "short",
  }).format(fromZonedTime(`${dayStr}T12:00:00`, CABINET_TIMEZONE));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday];
}

/**
 * Construit l'instant UTC correspondant à l'heure murale `minutesSinceMidnight`
 * (depuis minuit Paris) le **jour de Paris** désigné par `date`.
 *
 * Exemple : `slotInstant(<2026-07-15>, 600)` → 2026-07-15T08:00:00Z
 * (10:00 Paris en CEST). Gère automatiquement CET/CEST.
 */
export function slotInstant(date: Date, minutesSinceMidnight: number): Date {
  const dayStr = formatInTimeZone(date, CABINET_TIMEZONE, "yyyy-MM-dd");
  const hh = pad(Math.floor(minutesSinceMidnight / 60));
  const mm = pad(minutesSinceMidnight % 60);
  return fromZonedTime(`${dayStr}T${hh}:${mm}:00`, CABINET_TIMEZONE);
}

/**
 * Bornes UTC `[startUtc, endUtc)` du **jour de Paris** désigné par `date`,
 * pour filtrer en base les rendez-vous/exceptions de cette journée
 * indépendamment du fuseau serveur (remplace `startOfDay`/`endOfDay`).
 *
 * `endUtc` est le minuit Paris du **lendemain** (borne exclusive) : robuste
 * aux jours de 23 h / 25 h des changements d'heure.
 */
export function zonedDayBoundsUtc(date: Date): { startUtc: Date; endUtc: Date } {
  const dayStr = formatInTimeZone(date, CABINET_TIMEZONE, "yyyy-MM-dd");
  const [y, m, d] = dayStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)); // roule mois/année
  const nextStr = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return {
    startUtc: fromZonedTime(`${dayStr}T00:00:00`, CABINET_TIMEZONE),
    endUtc: fromZonedTime(`${nextStr}T00:00:00`, CABINET_TIMEZONE),
  };
}
