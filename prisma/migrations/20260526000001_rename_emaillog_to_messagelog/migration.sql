-- Migration: Renommage EmailLog → MessageLog et unification avec le canal SMS (story 6.3)
-- ----------------------------------------------------------------------------
-- 1. Renommer la table email_logs → message_logs
-- 2. Renommer les enums EmailType/EmailStatus → MessageType/MessageStatus
-- 3. Créer l'enum MessageChannel (EMAIL, SMS)
-- 4. Ajouter colonnes channel / to / cost / cost_unit sur message_logs
-- 5. Backfill "to" depuis patient.email via appointment_id

-- 1. Rename table
ALTER TABLE "email_logs" RENAME TO "message_logs";

-- Rename pkey constraint pour cohérence
ALTER INDEX "email_logs_pkey" RENAME TO "message_logs_pkey";

-- 2. Rename enums
ALTER TYPE "EmailType" RENAME TO "MessageType";
ALTER TYPE "EmailStatus" RENAME TO "MessageStatus";

-- 3. Create MessageChannel enum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS');

-- 4. Add new columns
ALTER TABLE "message_logs" ADD COLUMN "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "message_logs" ADD COLUMN "to" TEXT NOT NULL DEFAULT '';
ALTER TABLE "message_logs" ADD COLUMN "cost" DECIMAL(10, 5);
ALTER TABLE "message_logs" ADD COLUMN "cost_unit" TEXT;

-- 5. Backfill "to" depuis l'email du patient via appointment_id
UPDATE "message_logs" ml
SET "to" = COALESCE(p.email, '')
FROM "appointments" a
JOIN "patients" p ON p.id = a.patient_id
WHERE ml.appointment_id = a.id;

-- Une fois le backfill effectué, on lève le DEFAULT '' (les nouvelles insertions doivent fournir "to")
ALTER TABLE "message_logs" ALTER COLUMN "to" DROP DEFAULT;
