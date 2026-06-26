-- Story 11.3 : Journal d'audit RGPD (épopée 11 — RGPD / Sécurité).
-- Nouvelle table single-tenant `audit_logs` : piste d'audit **append-only** des
-- opérations sensibles (export art. 20, effacement art. 17, changements de
-- consentement 11.1) + 1 enum + 2 index.
--
-- ⚠️ Lien patient DÉNORMALISÉ : `patient_id` n'a AUCUNE clé étrangère ni cascade,
-- afin que l'entrée d'audit (notamment « effacement du patient ») SURVIVE à la
-- suppression du patient. `patient_label` fige le nom au moment de l'action.
--
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout patient/RDV/note/document/antécédent/consentement existant
-- reste inchangé.

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PATIENT_EXPORT', 'PATIENT_ERASURE', 'CONSENT_GRANTED', 'CONSENT_REVOKED', 'CONSENT_RESET');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "patient_id" TEXT,
    "patient_label" TEXT,
    "actor_id" TEXT NOT NULL,
    "actor_email" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_idx" ON "audit_logs" ("patient_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
