-- Story 7.2 : Congés et jours fériés.
-- Modèle single-tenant `TimeOff` qui se superpose à `WorkingHours` (7.1)
-- pour retrancher des créneaux dans le tunnel public.

-- CreateEnum
CREATE TYPE "TimeOffSource" AS ENUM ('MANUAL', 'HOLIDAY');

-- CreateTable
CREATE TABLE "time_off" (
    "id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,
    "source" "TimeOffSource" NOT NULL DEFAULT 'MANUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_off_start_date_end_date_idx" ON "time_off" ("start_date", "end_date");
