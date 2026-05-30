/**
 * Calcul des jours fériés français (métropole) — module pur (story 7.2).
 *
 * Décision PO : calculer en local plutôt que d'interroger une API au runtime
 * (`calendrier.api.gouv.fr` sert de référence de correction pour les tests, pas
 * de source). Avantages : zéro dépendance réseau, testabilité totale, pas de
 * latence sur les chemins publics.
 *
 * Fériés métropole (11) : Jour de l'an (01/01), Lundi de Pâques (Pâques+1),
 * Fête du Travail (01/05), Victoire 1945 (08/05), Ascension (Pâques+39),
 * Lundi de Pentecôte (Pâques+50), Fête nationale (14/07), Assomption (15/08),
 * Toussaint (01/11), Armistice (11/11), Noël (25/12).
 *
 * Le Vendredi Saint et le 26/12 (Alsace-Moselle) sont volontairement exclus.
 *
 * @module lib/cabinet/holidays
 */

/**
 * Date au format ISO "YYYY-MM-DD" — sérialisable, comparable lexicographiquement,
 * insensible au fuseau (c'est un jour calendaire, pas un instant).
 */
export type IsoDate = string;

export interface FrenchHoliday {
  /** Date du férié au format "YYYY-MM-DD". */
  date: IsoDate;
  /** Libellé FR — utilisé comme `reason` lors de la matérialisation. */
  label: string;
}

/** Formate une `Date` en "YYYY-MM-DD" à partir de ses composantes **UTC**. */
function formatIsoDateUtc(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Dimanche de Pâques pour une année grégorienne donnée.
 *
 * Implémentation : algorithme grégorien anonyme (Meeus / Butcher). Le résultat
 * est posé en UTC pour rester insensible au fuseau d'exécution (on n'utilise
 * que les composantes calendaires).
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=mars, 4=avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Ajoute `days` jours à une date UTC. */
function addDaysUtc(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

/**
 * Liste des jours fériés FR métropole pour une année (11 dates).
 *
 * Le résultat est trié chronologiquement.
 */
export function computeFrenchHolidays(year: number): FrenchHoliday[] {
  const easter = easterSunday(year);

  const fixed: FrenchHoliday[] = [
    { date: `${year}-01-01`, label: "Jour de l'an" },
    { date: `${year}-05-01`, label: "Fête du Travail" },
    { date: `${year}-05-08`, label: "Victoire 1945" },
    { date: `${year}-07-14`, label: "Fête nationale" },
    { date: `${year}-08-15`, label: "Assomption" },
    { date: `${year}-11-01`, label: "Toussaint" },
    { date: `${year}-11-11`, label: "Armistice 1918" },
    { date: `${year}-12-25`, label: "Noël" },
  ];

  const mobile: FrenchHoliday[] = [
    { date: formatIsoDateUtc(addDaysUtc(easter, 1)), label: "Lundi de Pâques" },
    { date: formatIsoDateUtc(addDaysUtc(easter, 39)), label: "Ascension" },
    { date: formatIsoDateUtc(addDaysUtc(easter, 50)), label: "Lundi de Pentecôte" },
  ];

  return [...fixed, ...mobile].sort((a, b) => a.date.localeCompare(b.date));
}
