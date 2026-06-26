"use server";

/**
 * Server Actions de lecture du journal d'audit RGPD (story 11.3).
 *
 * Surface **lecture seule** de la piste d'audit append-only : aucune action
 * d'écriture/suppression d'entrée n'est exposée (l'écriture passe exclusivement
 * par `@/lib/server/audit` au sein des actions tracées).
 *
 * ⚠️ Module `"use server"`, PAS une route : ne jamais renommer `page.tsx`/`route.ts`.
 *
 * Sécurité (héritée 5.2) :
 *  - `requireUser()` en tête ;
 *  - tout `id` (ici le `patientId` de filtre optionnel) est validé via
 *    `assertValidUuid()` AVANT tout appel Prisma ;
 *  - Prisma paramétré ; aucune surface publique.
 *
 * @module app/dashboard/audit/actions
 */

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { assertValidUuid } from "@/lib/validations/uuid";
import type { AuditActionType } from "@/lib/rgpd/audit";

/** Limite par défaut d'entrées renvoyées. */
const DEFAULT_LIMIT = 200;
/** Limite maximale (borne haute de protection). */
const MAX_LIMIT = 500;

/** Représentation d'une entrée d'audit pour l'affichage. */
export type AuditLogEntryData = {
  id: string;
  action: AuditActionType;
  patientId: string | null;
  patientLabel: string | null;
  actorEmail: string | null;
  summary: string | null;
  createdAt: Date;
};

/** Mappe une entrée Prisma vers le type d'affichage. */
function toAuditLogEntryData(entry: {
  id: string;
  action: AuditActionType;
  patientId: string | null;
  patientLabel: string | null;
  actorEmail: string | null;
  summary: string | null;
  createdAt: Date;
}): AuditLogEntryData {
  return {
    id: entry.id,
    action: entry.action,
    patientId: entry.patientId,
    patientLabel: entry.patientLabel,
    actorEmail: entry.actorEmail,
    summary: entry.summary,
    createdAt: entry.createdAt,
  };
}

/**
 * Récupère les entrées du journal d'audit, des plus récentes aux plus anciennes.
 *
 * @param options.patientId Filtre optionnel sur un patient (UUID validé ; invalide → `[]`).
 * @param options.limit Nombre maximum d'entrées (défaut 200, borné à 500).
 * @throws {UnauthorizedError} Si l'utilisateur n'est pas authentifié.
 */
export async function getAuditLogEntries(options?: {
  patientId?: string;
  limit?: number;
}): Promise<AuditLogEntryData[]> {
  try {
    await requireUser();

    const where: { patientId?: string } = {};
    if (options?.patientId !== undefined) {
      assertValidUuid(options.patientId);
      where.patientId = options.patientId;
    }

    const limit = Math.min(
      Math.max(1, Math.floor(options?.limit ?? DEFAULT_LIMIT)),
      MAX_LIMIT
    );

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return entries.map((e) => toAuditLogEntryData(e as AuditLogEntryData));
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error instanceof BadRequestError) {
      console.error("[getAuditLogEntries] Invalid UUID:", error.message);
      return [];
    }
    console.error("[getAuditLogEntries] Error:", error);
    throw new Error(
      `Failed to fetch audit log: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
