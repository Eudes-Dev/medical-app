/**
 * Configuration du cabinet (single-tenant).
 *
 * Source UNIQUE consommée à la fois par:
 * - La landing page publique (affichage nom/adresse/horaires)
 * - La logique de génération de créneaux (`getAvailableSlots`)
 *
 * Pour le MVP single-tenant, ces valeurs sont en dur. Lors du passage
 * multi-tenant (story 18.1), elles seront résolues depuis la base via le slug.
 *
 * @module lib/cabinet/config
 */

export interface OpeningHours {
  /** Heure de début (24h, ex: 8 pour 08:00). */
  start: number;
  /** Heure de fin (24h, exclusive — ex: 18 pour s'arrêter à 18:00). */
  end: number;
  /** Durée d'un créneau en minutes. */
  slotMinutes: number;
}

export interface CabinetInfo {
  name: string;
  address: string;
  phone: string;
  openingHoursLabel: string;
  openingHours: OpeningHours;
}

export const CABINET_INFO: CabinetInfo = {
  name: "Cabinet Médical",
  address: "12 rue de la Santé, 75014 Paris",
  phone: "01 23 45 67 89",
  openingHoursLabel: "Lundi au vendredi, 8h00 – 18h00",
  openingHours: {
    start: 8,
    end: 18,
    slotMinutes: 30,
  },
};

/** Timezone du cabinet — utilisé pour les rappels automatiques (story 6.2). */
export const CABINET_TIMEZONE = "Europe/Paris";

/**
 * Slug canonique du cabinet pour les liens internes.
 * Pour le MVP single-tenant, n'importe quelle valeur est acceptée par les
 * routes dynamiques — celle-ci sert uniquement pour générer des liens.
 */
export const CABINET_DEFAULT_SLUG =
  process.env.NEXT_PUBLIC_CABINET_SLUG ?? "cabinet";
