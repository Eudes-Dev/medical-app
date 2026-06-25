"use server";

/**
 * Server Actions de la liste d'attente (story 8.5).
 *
 * File priorisée de demandes de rendez-vous non satisfaites + matching « créneau
 * libéré » + pont de conversion vers `createAppointment` (la création de RDV
 * reste 100 % `calendar/actions.ts`, anti-collision incluse — aucune logique
 * dupliquée ici).
 *
 * Conventions reprises de `calendar/actions.ts` (story 3.3/8.4) : `requireUser()`
 * en tête, `assertValidUuid` sur les ids, `revalidatePath(WAITLIST_PATH)` unique
 * après mutation, `catch` final qui relance `UnauthorizedError`, mappe
 * `BadRequestError` → « identifiant invalide » et le reste → message générique +
 * `console.error`.
 *
 * @module app/dashboard/waitlist/actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  waitlistEntrySchema,
  type WaitlistEntryFormValues,
} from "@/lib/validations/waitlist";
import { sortWaitlistEntries } from "@/lib/waitlist/waitlist-utils";
import type { WaitlistEntryWithPatient, WaitlistPriority } from "@/types";

/** Chemin de la page liste d'attente à revalider après mutation. */
const WAITLIST_PATH = "/dashboard/waitlist";

/** `include` Prisma partagé : patient + soin (champs minimaux du DTO). */
const WAITLIST_INCLUDE = {
  patient: {
    select: { id: true, firstName: true, lastName: true, phone: true, email: true },
  },
  serviceType: {
    select: { id: true, label: true, durationMin: true, color: true },
  },
} as const;

/** Forme Prisma minimale consommée par le mapper DTO. */
interface WaitlistEntryRow {
  id: string;
  patientId: string;
  priority: WaitlistPriority;
  status: string;
  reason: string | null;
  notes: string | null;
  preferredFrom: Date | null;
  preferredTo: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  serviceType: {
    id: string;
    label: string;
    durationMin: number;
    color: string;
  } | null;
}

/**
 * Projette le résultat Prisma vers le DTO `WaitlistEntryWithPatient`.
 * Ne fait fuiter aucun champ non nécessaire (pas de `resolvedAppointmentId`,
 * `updatedAt`…).
 */
function toWaitlistEntryWithPatient(
  row: WaitlistEntryRow,
): WaitlistEntryWithPatient {
  return {
    id: row.id,
    patientId: row.patientId,
    priority: row.priority,
    status: row.status as WaitlistEntryWithPatient["status"],
    reason: row.reason,
    notes: row.notes,
    preferredFrom: row.preferredFrom,
    preferredTo: row.preferredTo,
    createdAt: row.createdAt,
    patient: {
      id: row.patient.id,
      firstName: row.patient.firstName,
      lastName: row.patient.lastName,
      phone: row.patient.phone,
      email: row.patient.email,
    },
    serviceType: row.serviceType
      ? {
          id: row.serviceType.id,
          label: row.serviceType.label,
          durationMin: row.serviceType.durationMin,
          color: row.serviceType.color,
        }
      : null,
  };
}

/** Résultat d'une mutation d'ajout à la liste d'attente. */
export type WaitlistActionResult =
  | { success: true; entry: WaitlistEntryWithPatient }
  | { success: false; error: string };

/**
 * Ajoute un patient à la liste d'attente (statut `WAITING`).
 *
 * 1. Valide `data` (`waitlistEntrySchema`).
 * 2. Vérifie l'existence du patient.
 * 3. Si un soin est visé, vérifie qu'il existe **et n'est pas archivé** (même
 *    garde SEC-002 que `resolveServiceSnapshot`, story 7.3).
 * 4. Crée l'entrée et revalide la page.
 */
export async function addToWaitlist(
  data: WaitlistEntryFormValues,
): Promise<WaitlistActionResult> {
  try {
    await requireUser();

    const parsed = waitlistEntrySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "Données invalides. Vérifiez le formulaire." };
    }
    const { patientId, serviceTypeId, priority, reason, notes, preferredFrom, preferredTo } =
      parsed.data;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) {
      return { success: false, error: "Patient introuvable." };
    }

    if (serviceTypeId) {
      const service = await prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { active: true },
      });
      if (!service) {
        return { success: false, error: "Type de soin introuvable." };
      }
      // Story 7.3 (SEC-002) : un service archivé ne peut pas être visé.
      if (!service.active) {
        return {
          success: false,
          error: "Ce type de soin est archivé et n'est plus disponible.",
        };
      }
    }

    const created = await prisma.waitlistEntry.create({
      data: {
        patientId,
        priority,
        reason: reason ?? null,
        notes: notes ?? null,
        status: "WAITING",
        preferredFrom: preferredFrom ?? null,
        preferredTo: preferredTo ?? null,
        ...(serviceTypeId ? { serviceTypeId } : {}),
      },
      include: WAITLIST_INCLUDE,
    });

    revalidatePath(WAITLIST_PATH);
    return { success: true, entry: toWaitlistEntryWithPatient(created) };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    console.error("[addToWaitlist] Error:", e);
    return {
      success: false,
      error: "Impossible d'ajouter à la liste d'attente. Réessayez plus tard.",
    };
  }
}

/**
 * Retourne la file active (`status = WAITING`), patient + soin inclus, triée par
 * priorité décroissante puis FIFO (tri en mémoire, cf. `waitlist-utils`).
 */
export async function getWaitlist(): Promise<WaitlistEntryWithPatient[]> {
  await requireUser();

  const rows = await prisma.waitlistEntry.findMany({
    where: { status: "WAITING" },
    include: WAITLIST_INCLUDE,
  });

  return sortWaitlistEntries(rows.map(toWaitlistEntryWithPatient));
}

/**
 * Retire une entrée de la file : passe à `status: CANCELLED` (pas de hard delete —
 * la ligne est conservée pour un futur historique).
 */
export async function removeFromWaitlist(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();
    assertValidUuid(id);

    // Garde de statut : seule une entrée `WAITING` peut être annulée — la
    // transition reste idempotente (un second appel ne touche rien). `updateMany`
    // car le `where` composé (id + status) n'est pas un sélecteur unique.
    const { count } = await prisma.waitlistEntry.updateMany({
      where: { id, status: "WAITING" },
      data: { status: "CANCELLED" },
    });
    if (count === 0) {
      return { success: false, error: "Cette entrée n'est plus dans la file d'attente." };
    }

    revalidatePath(WAITLIST_PATH);
    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    if (e instanceof BadRequestError) {
      return { success: false, error: "Identifiant invalide." };
    }
    console.error("[removeFromWaitlist] Error:", e);
    return {
      success: false,
      error: "Impossible de retirer de la liste d'attente. Réessayez plus tard.",
    };
  }
}

/**
 * Marque une entrée comme convertie en RDV (`status: SCHEDULED` +
 * `resolvedAppointmentId`). Appelée **après** un `createAppointment` réussi (la
 * création du RDV n'est jamais ré-implémentée ici).
 */
export async function markWaitlistScheduled(
  entryId: string,
  appointmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();
    assertValidUuid(entryId);
    assertValidUuid(appointmentId);

    // Garde de statut : seule une entrée `WAITING` peut être convertie (pas de
    // double conversion ni de réécriture d'un `resolvedAppointmentId`).
    // `updateMany` car le `where` composé (id + status) n'est pas unique.
    const { count } = await prisma.waitlistEntry.updateMany({
      where: { id: entryId, status: "WAITING" },
      data: { status: "SCHEDULED", resolvedAppointmentId: appointmentId },
    });
    if (count === 0) {
      return { success: false, error: "Cette entrée a déjà été traitée." };
    }

    revalidatePath(WAITLIST_PATH);
    return { success: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    if (e instanceof BadRequestError) {
      return { success: false, error: "Identifiant invalide." };
    }
    console.error("[markWaitlistScheduled] Error:", e);
    return {
      success: false,
      error: "Impossible de mettre à jour l'entrée. Réessayez plus tard.",
    };
  }
}

/**
 * Clé calendaire `yyyy-mm-dd` en heure **locale** d'une Date (slot du dashboard).
 * Convention TZ locale (REL-001) — on n'importe aucun helper Paris ici (réservés
 * au tunnel public, cf. story 8.5 §Fuseau horaire). L'harmonisation TZ dashboard
 * ↔ tunnel est une story transverse distincte.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Clé calendaire `yyyy-mm-dd` d'une borne `@db.Date` (stockée à minuit UTC).
 * On lit les composantes **UTC** pour récupérer le jour calendaire pur, sans
 * décalage de fuseau.
 */
function dateDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Retourne les entrées `WAITING` **compatibles** avec un créneau libéré, triées
 * comme `getWaitlist`. Matching best-effort / non bloquant (suggère, ne réserve
 * rien) :
 * - **type de soin** : une entrée sans `serviceTypeId` matche tout ; une entrée
 *   ciblée ne matche que si le créneau porte le **même** soin.
 * - **fenêtre de dates** : une entrée sans fenêtre matche toujours ; sinon le
 *   jour calendaire **local** du créneau doit être dans `[preferredFrom,
 *   preferredTo]` inclus.
 * - **durée** : une entrée ciblant un soin n'est suggérée que si le créneau
 *   libéré est **au moins aussi long** que la durée nominale de ce soin. Une
 *   entrée sans soin (« n'importe quel soin ») a une durée inconnue → conservée
 *   (best-effort). Si le créneau ne porte pas de `durationMin`, aucun filtre
 *   durée n'est appliqué.
 *
 * @param slot - Créneau libéré : `startTime` (requis), `serviceTypeId` du RDV
 *   annulé (optionnel), `durationMin` (optionnel, durée réelle du créneau libéré).
 */
export async function getMatchingWaitlistEntries(slot: {
  startTime: Date;
  serviceTypeId?: string;
  durationMin?: number;
}): Promise<WaitlistEntryWithPatient[]> {
  await requireUser();

  const rows = await prisma.waitlistEntry.findMany({
    where: { status: "WAITING" },
    include: WAITLIST_INCLUDE,
  });

  const slotDayKey = localDayKey(slot.startTime);

  const matching = rows.filter((row) => {
    // Type de soin : entrée ciblée → doit viser le même soin que le créneau.
    if (row.serviceType && row.serviceType.id !== slot.serviceTypeId) {
      return false;
    }
    // Durée : entrée ciblée → le créneau libéré doit tenir la durée nominale du
    // soin (un créneau de 15 min ne suggère pas une entrée visant un soin 60 min).
    if (
      slot.durationMin != null &&
      row.serviceType &&
      row.serviceType.durationMin > slot.durationMin
    ) {
      return false;
    }
    // Fenêtre de dates : si bornée, le jour du créneau doit y tomber (inclus).
    if (row.preferredFrom && slotDayKey < dateDayKey(row.preferredFrom)) {
      return false;
    }
    if (row.preferredTo && slotDayKey > dateDayKey(row.preferredTo)) {
      return false;
    }
    return true;
  });

  return sortWaitlistEntries(matching.map(toWaitlistEntryWithPatient));
}
