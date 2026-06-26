/**
 * Couche d'écriture du journal d'audit RGPD (story 11.3).
 *
 * Fine couche d'accès (mockable comme `@/lib/storage/medical-documents`) qui
 * insère une entrée **append-only** dans `audit_logs`. Aucune logique métier ici :
 * juste le `prisma.auditLog.create`.
 *
 * ⚠️ **Best-effort** : `recordAuditEvent` ne lève **jamais**. Une erreur d'audit
 * ne doit pas faire échouer l'action métier qu'elle trace (export, effacement,
 * consentement) — même philosophie que la purge Storage best-effort de 11.2.
 * Le durcissement (audit transactionnel/inviolable) est hors périmètre.
 *
 * @module lib/server/audit
 */

import { prisma } from "@/lib/prisma";
import type { AuditActionType } from "@/lib/rgpd/audit";

/** Données d'un événement à consigner. */
export type AuditEventInput = {
  action: AuditActionType;
  actorId: string;
  actorEmail?: string | null;
  /** ID du patient concerné (dénormalisé, optionnel). */
  patientId?: string | null;
  /** Snapshot du libellé patient au moment de l'action. */
  patientLabel?: string | null;
  /** Détail FR lisible (libellé d'action — jamais de contenu sensible). */
  summary?: string | null;
};

/**
 * Consigne un événement dans le journal d'audit (append-only, best-effort).
 *
 * Ne lève jamais : toute erreur Prisma est capturée et journalisée afin de
 * garantir que l'action métier tracée n'est jamais bloquée par l'audit.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        actorEmail: input.actorEmail ?? null,
        patientId: input.patientId ?? null,
        patientLabel: input.patientLabel ?? null,
        summary: input.summary ?? null,
      },
    });
  } catch (error) {
    // Best-effort : on n'interrompt jamais l'action métier tracée.
    console.error("[recordAuditEvent] Audit write failed (continuing):", error);
  }
}
