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
  /**
   * @deprecated Depuis la story 7.1, les créneaux du tunnel public ne sont
   * plus générés à partir de cette constante mais du modèle persistant
   * `WorkingHours` (voir `lib/cabinet/slots.ts` + `app/(public)/.../book/actions.ts`).
   * Conservée temporairement : n'a plus d'effet sur la génération de créneaux.
   * À retirer une fois le label public dérivé de `WorkingHours` (hand-off 7.4).
   */
  openingHours: OpeningHours;
}

export const CABINET_INFO: CabinetInfo = {
  name: "Cabinet Médical",
  address: "12 rue de la Santé, 75014 Paris",
  phone: "01 23 45 67 89",
  openingHoursLabel: "Lundi au vendredi, 8h00 – 18h00",
  // @deprecated (story 7.1) — n'est plus la source des créneaux ; conservé
  // pour le label statique de la landing en attendant la story 7.4.
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
