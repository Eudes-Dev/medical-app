/**
 * Configuration du cabinet (single-tenant).
 *
 * Depuis la story 7.4, l'identité publique du cabinet (nom/adresse/téléphone)
 * est portée par le modèle persistant `CabinetProfile` (table `cabinet_profile`)
 * et lue via `getPublicCabinetProfile()`. `CABINET_INFO` n'est plus la source de
 * vérité : il ne sert plus que de **valeurs de repli** (defaults d'amorçage) si
 * la table profil est vide, et n'est plus importé par les surfaces publiques.
 *
 * Restent des constantes de configuration à part entière (NE PAS retirer) :
 * - `CABINET_TIMEZONE`   — fuseau du cabinet (rappels 6.2 / TZ 5.3)
 * - `CABINET_DEFAULT_SLUG` — slug canonique pour les liens internes (layout public)
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

/**
 * Valeurs de repli de l'identité du cabinet (story 7.4).
 *
 * @deprecated comme source de vérité : utiliser `getPublicCabinetProfile()`.
 * Conservé uniquement comme defaults d'amorçage si la table `cabinet_profile`
 * est vide (premier déploiement). N'est plus importé par les surfaces publiques.
 */
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
