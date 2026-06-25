-- Story 9.1 : Notes de consultation (historique clinique structuré du dossier patient).
-- Nouvelle table single-tenant `consultation_notes` + index + FKs.
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout patient/RDV existant reste inchangé (y compris `patients.notes`).

-- CreateTable
CREATE TABLE "consultation_notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_notes_patient_id_idx" ON "consultation_notes" ("patient_id");

-- CreateIndex
CREATE INDEX "consultation_notes_appointment_id_idx" ON "consultation_notes" ("appointment_id");

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
