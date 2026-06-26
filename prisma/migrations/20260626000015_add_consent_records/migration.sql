-- Story 11.1 : Consentement RGPD (épopée 11 — RGPD / Sécurité).
-- Nouvelle table single-tenant `consent_records` : état courant du consentement
-- par patient et par finalité (un état unique par couple patient/finalité),
-- horodaté et versionné + 1 enum + index + FK.
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout patient/RDV/note/document/antécédent existant reste inchangé
-- (y compris `patients.notes`, `patients.reminder_opt_out`).

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'HEALTH_DATA', 'COMMUNICATION');

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "policy_version" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_patient_id_type_key" ON "consent_records" ("patient_id", "type");

-- CreateIndex
CREATE INDEX "consent_records_patient_id_idx" ON "consent_records" ("patient_id");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
