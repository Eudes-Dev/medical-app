-- Story 9.3 : Antécédents médicaux (dossier patient, épopée 9).
-- Nouvelle table single-tenant `medical_history_entries` (fond clinique
-- structuré et catégorisé : allergies, traitements, ATCD chirurgicaux/familiaux)
-- + 1 enum + index + FK.
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout patient/RDV/note/document existant reste inchangé
-- (y compris `patients.notes`).

-- CreateEnum
CREATE TYPE "MedicalHistoryCategory" AS ENUM ('ALLERGY', 'CURRENT_TREATMENT', 'SURGICAL_HISTORY', 'FAMILY_HISTORY', 'OTHER');

-- CreateTable
CREATE TABLE "medical_history_entries" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "category" "MedicalHistoryCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_history_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_history_entries_patient_id_idx" ON "medical_history_entries" ("patient_id");

-- AddForeignKey
ALTER TABLE "medical_history_entries" ADD CONSTRAINT "medical_history_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
