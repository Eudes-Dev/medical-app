"use server";

/**
 * Server Actions pour le consentement RGPD (story 11.1).
 *
 * Première brique de l'épopée 11 « RGPD / Sécurité » : traçabilité de l'état
 * courant du consentement par patient et par finalité (données personnelles,
 * données de santé, communications), horodaté et versionné.
 *
 * ⚠️ Ce fichier est un module `"use server"`, PAS une route : il ne doit jamais
 * être renommé `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - Toutes les actions passent par `requireUser()`.
 *  - Tout `id` est validé via `assertValidUuid()` avant tout appel Prisma.
 *  - Les inputs ne sont consommés que via Prisma paramétré + schéma Zod.
 *
 * @module app/dashboard/patients/consent-actions
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import {
  consentInputSchema,
  CONSENT_POLICY_VERSION,
  CONSENT_TYPE_LABELS,
  type ConsentInput,
  type ConsentType,
} from "@/lib/validations/consent";
import { recordAuditEvent } from "@/lib/server/audit";

/**
 * Représentation d'un consentement RGPD pour l'affichage.
 */
export type ConsentRecordData = {
  id: string;
  patientId: string;
  type: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  policyVersion: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Mappe un consentement Prisma vers le type d'affichage. */
function toConsentRecordData(record: {
  id: string;
  patientId: string;
  type: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  policyVersion: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ConsentRecordData {
  return {
    id: record.id,
    patientId: record.patientId,
    type: record.type,
    granted: record.granted,
    grantedAt: record.grantedAt,
    revokedAt: record.revokedAt,
    policyVersion: record.policyVersion,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Récupère les consentements enregistrés d'un patient.
 *
 * Les finalités sans ligne sont considérées « non renseignées » côté UI.
 *
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getConsentRecords(
  patientId: string
): Promise<ConsentRecordData[]> {
  try {
    await requireUser();
    assertValidUuid(patientId);

    const records = await prisma.consentRecord.findMany({
      where: { patientId },
    });

    return records.map(toConsentRecordData);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getConsentRecords] Invalid UUID:", error.message);
      return [];
    }
    console.error("[getConsentRecords] Error:", error);
    throw new Error(
      `Failed to fetch consent records: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Enregistre (upsert) l'état de consentement d'une finalité pour un patient.
 *
 * - `granted === true`  → `grantedAt=now`, `revokedAt=null`, `policyVersion` figée.
 * - `granted === false` → `revokedAt=now` (le `grantedAt` du dernier accord est conservé).
 *
 * La `note` est mise à jour dans les deux cas.
 */
export async function setConsentStatus(
  patientId: string,
  input: ConsentInput
): Promise<
  | { success: true; record: ConsentRecordData }
  | { success: false; error: string }
> {
  try {
    const user = await requireUser();
    assertValidUuid(patientId);

    const parsed = consentInputSchema.safeParse(input);
    if (!parsed.success) {
      console.error(
        "[setConsentStatus] Validation error:",
        parsed.error.flatten()
      );
      return {
        success: false,
        error: "Le consentement est invalide. Vérifiez les informations saisies.",
      };
    }

    const { type, granted, note } = parsed.data;
    const now = new Date();

    const record = await prisma.consentRecord.upsert({
      where: { patientId_type: { patientId, type } },
      create: {
        patientId,
        type,
        granted,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
        policyVersion: CONSENT_POLICY_VERSION,
        note: note ?? null,
      },
      update: granted
        ? {
            granted: true,
            grantedAt: now,
            revokedAt: null,
            policyVersion: CONSENT_POLICY_VERSION,
            note: note ?? null,
          }
        : {
            granted: false,
            revokedAt: now,
            note: note ?? null,
          },
    });

    // Journal d'audit (11.3) — best-effort, ne bloque jamais le succès.
    await recordAuditEvent({
      action: granted ? "CONSENT_GRANTED" : "CONSENT_REVOKED",
      actorId: user.id,
      actorEmail: user.email,
      patientId,
      summary: `${granted ? "Consentement accordé" : "Consentement retiré"} — ${
        CONSENT_TYPE_LABELS[type]
      }.`,
    });

    revalidatePath(`/dashboard/patients/${patientId}`);

    return { success: true, record: toConsentRecordData(record) };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour enregistrer un consentement.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de patient invalide." };
    }
    console.error("[setConsentStatus] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de l'enregistrement du consentement. Veuillez réessayer.",
    };
  }
}

/**
 * Réinitialise une finalité de consentement à « non renseigné » (suppression
 * de la ligne).
 */
export async function deleteConsentRecord(
  recordId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireUser();
    assertValidUuid(recordId);

    const record = await prisma.consentRecord.delete({
      where: { id: recordId },
    });

    // Journal d'audit (11.3) — best-effort, ne bloque jamais le succès.
    await recordAuditEvent({
      action: "CONSENT_RESET",
      actorId: user.id,
      actorEmail: user.email,
      patientId: record.patientId,
      summary: `Consentement réinitialisé — ${
        CONSENT_TYPE_LABELS[record.type as ConsentType]
      }.`,
    });

    revalidatePath(`/dashboard/patients/${record.patientId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        success: false,
        error: "Vous devez être connecté pour réinitialiser un consentement.",
      };
    }
    if (error instanceof BadRequestError) {
      return { success: false, error: "Identifiant de consentement invalide." };
    }
    console.error("[deleteConsentRecord] Error:", error);
    return {
      success: false,
      error:
        "Une erreur est survenue lors de la réinitialisation du consentement. Veuillez réessayer.",
    };
  }
}
