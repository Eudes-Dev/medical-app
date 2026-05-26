-- AlterTable: Add cancellationToken to Appointment (story 6.1)
ALTER TABLE "appointments" ADD COLUMN "cancellation_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_cancellation_token_key" ON "appointments"("cancellation_token");

-- CreateEnum: EmailType
CREATE TYPE "EmailType" AS ENUM ('CONFIRMATION', 'CANCELLATION', 'PRACTITIONER_NOTIFY');

-- CreateEnum: EmailStatus
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable: EmailLog
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "type" "EmailType" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
