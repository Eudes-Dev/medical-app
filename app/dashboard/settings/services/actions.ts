"use server";

/**
 * Server Actions du catalogue des types de soins (story 7.3).
 *
 * Single-tenant : un seul catalogue `ServiceType` pour l'unique cabinet.
 * Toutes les actions de gestion exigent un praticien authentifié
 * (`requireUser()`, défense en profondeur derrière le middleware `/dashboard`).
 * `getPublicServiceTypes` est la **seule** action publique (lecture seule,
 * `select` limité) ; elle alimente l'étape « motif » du tunnel `/book`.
 *
 * Convention reprise de `schedule/actions.ts` et `timeoff/actions.ts` :
 * `requireUser` en tête, `revalidatePath`, catch générique sans fuite, DTO
 * sérialisable (`Decimal → number`).
 *
 * @module app/dashboard/settings/services/actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  serviceTypeSchema,
  type ServiceTypeInput,
} from "@/lib/validations/service-type";

/** Chemins à revalider après écriture (page settings + calendrier praticien). */
const SERVICES_PATH = "/dashboard/settings/services";
const CALENDAR_PATH = "/dashboard/calendar";

/** Représentation sérialisable complète d'un `ServiceType` (dashboard). */
export interface ServiceTypeDTO {
  id: string;
  label: string;
  durationMin: number;
  color: string;
  /** Tarif en euros (`Decimal` sérialisé en `number`) ou `null`. */
  price: number | null;
  description: string | null;
  isPublic: boolean;
  active: boolean;
}

/** Vue publique (tunnel `/book`) — aucun champ interne sensible. */
export interface PublicServiceDTO {
  id: string;
  label: string;
  durationMin: number;
  price: number | null;
  description: string | null;
  color: string;
}

export type SimpleResult = { success: true } | { error: string };

/** Forme Prisma minimale consommée par le mapping DTO. */
interface ServiceTypeRow {
  id: string;
  label: string;
  durationMin: number;
  color: string;
  price: { toString(): string } | null;
  description: string | null;
  isPublic: boolean;
  active: boolean;
}

/** `Decimal | null` → `number | null` (le client ne manipule pas `Decimal`). */
function decimalToNumber(value: { toString(): string } | null): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

function toServiceTypeDTO(row: ServiceTypeRow): ServiceTypeDTO {
  return {
    id: row.id,
    label: row.label,
    durationMin: row.durationMin,
    color: row.color,
    price: decimalToNumber(row.price),
    description: row.description,
    isPublic: row.isPublic,
    active: row.active,
  };
}

// ---------------------------------------------------------------------------
// Lecture : getServiceTypes (dashboard)
// ---------------------------------------------------------------------------

/**
 * Renvoie **tous** les types de soins (actifs puis archivés), triés par libellé.
 * Les actifs apparaissent en premier (`active desc`) pour la section « Actifs ».
 */
export async function getServiceTypes(): Promise<ServiceTypeDTO[]> {
  await requireUser();

  const rows = await prisma.serviceType.findMany({
    orderBy: [{ active: "desc" }, { label: "asc" }],
  });

  return rows.map(toServiceTypeDTO);
}

// ---------------------------------------------------------------------------
// Lecture : getPublicServiceTypes (tunnel public — pas d'auth)
// ---------------------------------------------------------------------------

/**
 * Renvoie les services proposés au patient dans le tunnel `/book` :
 * uniquement `active && isPublic`, avec un `select` limité (aucun champ
 * interne). Triés par libellé. Liste vide ⇒ le tunnel applique son repli
 * (cf. Dev Notes « Repli tunnel »).
 */
// PUBLIC: pas d'auth requise — lecture seule consommée par le tunnel invité.
export async function getPublicServiceTypes(): Promise<PublicServiceDTO[]> {
  const rows = await prisma.serviceType.findMany({
    where: { active: true, isPublic: true },
    orderBy: { label: "asc" },
    select: {
      id: true,
      label: true,
      durationMin: true,
      price: true,
      description: true,
      color: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    durationMin: r.durationMin,
    price: decimalToNumber(r.price),
    description: r.description,
    color: r.color,
  }));
}

// ---------------------------------------------------------------------------
// Écriture : createServiceType
// ---------------------------------------------------------------------------

export async function createServiceType(
  input: ServiceTypeInput,
): Promise<SimpleResult> {
  try {
    await requireUser();

    const parsed = serviceTypeSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const v = parsed.data;

    await prisma.serviceType.create({
      data: {
        label: v.label,
        durationMin: v.durationMin,
        color: v.color,
        price: v.price ?? null,
        description: v.description ?? null,
        isPublic: v.isPublic,
        active: v.active,
      },
    });

    revalidatePath(SERVICES_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    console.error("[createServiceType] error:", err);
    return { error: "Impossible d'enregistrer le type de soin. Veuillez réessayer." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : updateServiceType
// ---------------------------------------------------------------------------

export async function updateServiceType(
  id: string,
  input: ServiceTypeInput,
): Promise<SimpleResult> {
  try {
    await requireUser();
    assertValidUuid(id);

    const parsed = serviceTypeSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
    }
    const v = parsed.data;

    await prisma.serviceType.update({
      where: { id },
      data: {
        label: v.label,
        durationMin: v.durationMin,
        color: v.color,
        price: v.price ?? null,
        description: v.description ?? null,
        isPublic: v.isPublic,
        active: v.active,
      },
    });

    revalidatePath(SERVICES_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof BadRequestError) return { error: "Identifiant invalide." };
    console.error("[updateServiceType] error:", err);
    return { error: "Impossible de mettre à jour le type de soin." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : deleteServiceType (suppression protégée — AC 6)
// ---------------------------------------------------------------------------

/**
 * Supprime un type de soin **uniquement** si aucun `Appointment` ne lui est
 * rattaché. Sinon renvoie `{ error: "HAS_APPOINTMENTS" }` : l'UI propose alors
 * l'archivage (`toggleServiceTypeActive(id, false)`), qui préserve l'historique.
 */
export async function deleteServiceType(id: string): Promise<SimpleResult> {
  try {
    await requireUser();
    assertValidUuid(id);

    const count = await prisma.appointment.count({
      where: { serviceTypeId: id },
    });
    if (count > 0) {
      return { error: "HAS_APPOINTMENTS" };
    }

    await prisma.serviceType.delete({ where: { id } });

    revalidatePath(SERVICES_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof BadRequestError) return { error: "Identifiant invalide." };
    console.error("[deleteServiceType] error:", err);
    return { error: "Impossible de supprimer le type de soin." };
  }
}

// ---------------------------------------------------------------------------
// Écriture : toggleServiceTypeActive (archivage / réactivation)
// ---------------------------------------------------------------------------

export async function toggleServiceTypeActive(
  id: string,
  active: boolean,
): Promise<SimpleResult> {
  try {
    await requireUser();
    assertValidUuid(id);

    await prisma.serviceType.update({
      where: { id },
      data: { active },
    });

    revalidatePath(SERVICES_PATH);
    revalidatePath(CALENDAR_PATH);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof BadRequestError) return { error: "Identifiant invalide." };
    console.error("[toggleServiceTypeActive] error:", err);
    return { error: "Impossible de mettre à jour le type de soin." };
  }
}
