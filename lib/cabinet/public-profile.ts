/**
 * Lecture publique du profil cabinet (story 7.4) — mémoïsée par requête.
 *
 * Module **hors `"use server"`** : la landing publique lit le profil 3 fois par
 * rendu (`generateMetadata` + page + layout). `React.cache()` déduplique ces
 * appels au sein d'une même requête de rendu (1 seul aller-retour DB au lieu de 3).
 *
 * Repli sur `CABINET_INFO` si la table profil est vide (AC 6) + libellé d'horaires
 * dérivé des `WorkingHours` (AC 4, story 7.1).
 *
 * @module lib/cabinet/public-profile
 */

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { CABINET_INFO } from "@/lib/cabinet/config";
import { formatOpeningHoursLabel } from "@/lib/cabinet/opening-hours-label";

/**
 * Vue publique du profil — `select` limité aux champs d'affichage + libellé
 * d'horaires dérivé. Aucun champ interne sensible.
 */
export interface PublicCabinetDTO {
  name: string;
  tagline: string | null;
  description: string | null;
  address: string;
  phone: string;
  email: string | null;
  accessInfo: string | null;
  /** Libellé d'horaires dérivé des `WorkingHours` (jamais stocké). */
  openingHoursLabel: string;
}

/** Champs d'affichage exposés publiquement (aucun champ interne). */
const PUBLIC_PROFILE_SELECT = {
  name: true,
  tagline: true,
  description: true,
  address: true,
  phone: true,
  email: true,
  accessInfo: true,
} as const;

async function readPublicCabinetProfile(): Promise<PublicCabinetDTO> {
  const [profile, workingHours] = await Promise.all([
    prisma.cabinetProfile.findFirst({ select: PUBLIC_PROFILE_SELECT }),
    prisma.workingHours.findMany({
      where: { active: true },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
  ]);

  return {
    name: profile?.name ?? CABINET_INFO.name,
    tagline: profile?.tagline ?? null,
    description: profile?.description ?? null,
    address: profile?.address ?? CABINET_INFO.address,
    phone: profile?.phone ?? CABINET_INFO.phone,
    email: profile?.email ?? null,
    accessInfo: profile?.accessInfo ?? null,
    openingHoursLabel: formatOpeningHoursLabel(workingHours),
  };
}

/**
 * Profil public du cabinet, **mémoïsé par requête** (React `cache`). Consommé par
 * les surfaces publiques (landing `metadata`/page/layout, tunnel `/book`).
 * Lecture seule, pas d'authentification.
 */
export const getPublicCabinetProfile = cache(readPublicCabinetProfile);
