-- Story 9.2 : Documents médicaux (dossier patient, épopée 9).
-- Nouvelle table single-tenant `medical_documents` (métadonnées uniquement —
-- le binaire vit dans un bucket Supabase Storage privé, cf. ADR
-- docs/architecture/5-stockage-fichiers-decision.md) + 1 enum + index + FK.
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout patient/RDV/note existant reste inchangé.

-- CreateEnum
CREATE TYPE "MedicalDocumentCategory" AS ENUM ('PRESCRIPTION', 'REPORT', 'IMAGING', 'ANALYSIS', 'OTHER');

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "category" "MedicalDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_documents_patient_id_idx" ON "medical_documents" ("patient_id");

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
