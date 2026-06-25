-- Story 8.5 : Liste d'attente (file priorisée + matching « créneau libéré »).
-- Nouvelle table single-tenant `waitlist_entries` + 2 enums + index + FKs.
-- Migration NON destructive : aucun DROP, aucune modification des tables/colonnes
-- existantes. Tout RDV/patient/soin existant reste inchangé.

-- CreateEnum
CREATE TYPE "WaitlistPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SCHEDULED', 'CANCELLED');

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "service_type_id" TEXT,
    "priority" "WaitlistPriority" NOT NULL DEFAULT 'NORMAL',
    "reason" TEXT,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "preferred_from" DATE,
    "preferred_to" DATE,
    "resolved_appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_entries_status_priority_idx" ON "waitlist_entries" ("status", "priority");

-- CreateIndex
CREATE INDEX "waitlist_entries_patient_id_idx" ON "waitlist_entries" ("patient_id");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
