/**
 * Formatage des dates de rendez-vous en fuseau `Europe/Paris`.
 *
 * Utilise l'API `Intl.DateTimeFormat` (built-in Node + navigateurs) pour
 * éviter d'introduire `date-fns-tz` tant que ce n'est pas nécessaire.
 *
 * @module lib/booking/format
 */

const FULL_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Formate un créneau en français long, ex.
 * « lundi 18 mai 2026 à 09:00 ».
 */
export function formatSlotParis(date: Date): string {
  // Intl renvoie typiquement « lundi 18 mai 2026, 09:00 » — on remplace la
  // virgule par « à » pour rester naturel dans la copie.
  return FULL_FORMATTER.format(date).replace(", ", " à ");
}

/**
 * Formate l'heure (HH:mm) d'un créneau en fuseau Paris.
 */
export function formatTimeParis(date: Date): string {
  return TIME_FORMATTER.format(date);
}
