/**
 * Dérivation du libellé d'horaires public à partir des `WorkingHours` (story 7.4,
 * hand-off 7.1).
 *
 * Module **pur** (sans Prisma) : agrège les plages actives en un libellé lisible
 * avec regroupement des jours consécutifs aux mêmes plages
 * (p. ex. « Lun–Ven : 9h–18h · Sam : 9h–12h »). Repli neutre si aucune plage.
 *
 * Source unique de vérité = la story 7.1 (`WorkingHours`) ; le libellé n'est donc
 * jamais stocké dans `CabinetProfile`.
 *
 * @module lib/cabinet/opening-hours-label
 */

import { toMinutes } from "@/lib/cabinet/working-hours";

/** Une plage telle que stockée dans `WorkingHours` (story 7.1). */
export interface OpeningHoursRow {
  /** Jour de la semaine : 0=Dimanche … 6=Samedi (convention JS `Date.getDay()`). */
  dayOfWeek: number;
  /** Heure de début "HH:mm" (24h). */
  startTime: string;
  /** Heure de fin "HH:mm" (24h, exclusive). */
  endTime: string;
  /** Plage active (les plages désactivées sont ignorées). Défaut : active. */
  active?: boolean;
}

/** Libellé affiché lorsqu'aucune plage active n'est configurée. */
export const OPENING_HOURS_FALLBACK = "Sur rendez-vous";

/** Abréviations des jours, indexées par `dayOfWeek` (0=Dimanche … 6=Samedi). */
const DAY_ABBR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

/** Ordre d'affichage : la semaine commence le lundi, dimanche en dernier. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** "09:00" → "9h" ; "09:30" → "9h30" ; "14:00" → "14h". */
function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "09:00"/"12:00" → "9h–12h". */
function formatRange(startTime: string, endTime: string): string {
  return `${formatHour(startTime)}–${formatHour(endTime)}`;
}

/**
 * Construit un libellé d'horaires lisible à partir des plages `WorkingHours`.
 *
 * - Filtre les plages inactives (`active === false`).
 * - Regroupe les plages d'un même jour (triées par heure de début) :
 *   « 9h–12h, 14h–18h ».
 * - Regroupe les jours **consécutifs** (ordre lundi→dimanche) partageant la même
 *   signature de plages : « Lun–Ven : 9h–18h ».
 * - Sépare les groupes par « · ».
 *
 * @example
 * formatOpeningHoursLabel([]) // "Sur rendez-vous"
 */
export function formatOpeningHoursLabel(rows: OpeningHoursRow[]): string {
  const active = rows.filter((r) => r.active !== false);
  if (active.length === 0) return OPENING_HOURS_FALLBACK;

  // dayOfWeek → signature lisible de ses plages (triées par heure de début).
  const signatureByDay = new Map<number, string>();
  for (const day of WEEK_ORDER) {
    const ranges = active
      .filter((r) => r.dayOfWeek === day)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    if (ranges.length === 0) continue;
    signatureByDay.set(
      day,
      ranges.map((r) => formatRange(r.startTime, r.endTime)).join(", "),
    );
  }

  // Regroupement des jours consécutifs (dans l'ordre lundi→dimanche) à signature
  // identique. Un jour fermé rompt le groupe.
  const segments: string[] = [];
  let i = 0;
  while (i < WEEK_ORDER.length) {
    const day = WEEK_ORDER[i];
    const signature = signatureByDay.get(day);
    if (signature === undefined) {
      i += 1;
      continue;
    }
    let j = i;
    while (
      j + 1 < WEEK_ORDER.length &&
      signatureByDay.get(WEEK_ORDER[j + 1]) === signature
    ) {
      j += 1;
    }
    const startLabel = DAY_ABBR[WEEK_ORDER[i]];
    const endLabel = DAY_ABBR[WEEK_ORDER[j]];
    const daysLabel = i === j ? startLabel : `${startLabel}–${endLabel}`;
    segments.push(`${daysLabel} : ${signature}`);
    i = j + 1;
  }

  return segments.join(" · ");
}
