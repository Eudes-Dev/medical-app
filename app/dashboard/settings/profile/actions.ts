"use server";

/**
 * Server Actions du profil public du cabinet (story 7.4).
 *
 * Single-tenant : un seul profil `CabinetProfile` (singleton) pour l'unique
 * cabinet. Les actions de mutation exigent un praticien authentifié
 * (`requireUser()`, défense en profondeur derrière le middleware `/dashboard`).
 * `getPublicCabinetProfile` est la **seule** action publique (lecture seule,
 * `select` limité) ; elle alimente la landing publique `/[cabinet-slug]`.
 *
 * Convention reprise de `schedule/actions.ts` et `services/actions.ts` :
 * `requireUser` en tête, `revalidatePath`, catch générique sans fuite, DTO
 * sérialisable.
 *
 * @module app/dashboard/settings/profile/actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError } from "@/lib/errors";
import {
  cabinetProfileSchema,
  type CabinetProfileInput,
} from "@/lib/validations/cabinet-profile";

/** Chemins à revalider après écriture : page d'édition + landing publique. */
const PROFILE_PATH = "/dashboard/settings/profile";
const PUBLIC_LANDING_PATH = "/[cabinet-slug]";

/** Profil éditable renvoyé au dashboard (sérialisable). */
export interface CabinetProfileDTO {
  name: string;
  tagline: string | null;
  description: string | null;
  address: string;
  phone: string;
  email: string | null;
  accessInfo: string | null;
}

export type SimpleResult = { success: true } | { error: string };

/** Champs d'affichage sélectionnés (partagés lecture dashboard + publique). */
const PROFILE_SELECT = {
  name: true,
  tagline: true,
  description: true,
  address: true,
  phone: true,
  email: true,
  accessInfo: true,
} as const;

// ---------------------------------------------------------------------------
// Lecture : getCabinetProfile (dashboard)
// ---------------------------------------------------------------------------

/**
 * Renvoie le profil du cabinet (singleton) pour l'édition, ou `null` si la table
 * est vide (premier déploiement sans seed).
 */
export async function getCabinetProfile(): Promise<CabinetProfileDTO | null> {
  await requireUser();

  const row = await prisma.cabinetProfile.findFirst({ select: PROFILE_SELECT });
  if (!row) return null;

  return {
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    address: row.address,
    phone: row.phone,
    email: row.email,
    accessInfo: row.accessInfo,
  };
}

// ---------------------------------------------------------------------------
// Écriture : updateCabinetProfile (upsert singleton)
// ---------------------------------------------------------------------------

/**
 * Met à jour (ou crée à la 1ʳᵉ écriture) le profil singleton du cabinet.
 *
 * Validation Zod serveur avant toute écriture ; revalide la page d'édition ET la
 * landing publique pour refléter immédiatement les changements. Catch générique
 * (pas de fuite), le détail restant loggé serveur.
 */
export async function updateCabinetProfile(
  input: CabinetProfileInput,
): Promise<SimpleResult> {
  try {
    await requireUser();

    const parsed = cabinetProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const v = parsed.data;

    const data = {
      name: v.name,
      tagline: v.tagline ?? null,
      description: v.description ?? null,
      address: v.address,
      phone: v.phone,
      email: v.email ?? null,
      accessInfo: v.accessInfo ?? null,
    };

    // Singleton : pas de clé d'upsert métier → find puis update/create.
    const existing = await prisma.cabinetProfile.findFirst({
      select: { id: true },
    });
    if (existing) {
      await prisma.cabinetProfile.update({ where: { id: existing.id }, data });
    } else {
      await prisma.cabinetProfile.create({ data });
    }

    revalidatePath(PROFILE_PATH);
    revalidatePath(PUBLIC_LANDING_PATH, "page");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    console.error("[updateCabinetProfile] error:", err);
    return { error: "Impossible d'enregistrer le profil. Veuillez réessayer." };
  }
}

// La lecture publique (`getPublicCabinetProfile`) vit dans
// `lib/cabinet/public-profile.ts` — module hors `"use server"`, mémoïsé par
// requête (React `cache`) pour dédupliquer les lectures de la landing.
