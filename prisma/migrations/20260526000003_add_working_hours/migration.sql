-- Story 7.1 : Configuration des horaires d'ouverture.
-- Modèle single-tenant `WorkingHours` (un seul jeu d'horaires pour l'unique cabinet).
-- Plusieurs lignes par `day_of_week` = plusieurs plages dans la journée.

-- CreateTable
CREATE TABLE "working_hours" (
    "id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "working_hours_day_of_week_idx" ON "working_hours" ("day_of_week");

-- Seed par défaut (AC 10) : Lundi→Vendredi 08:00–18:00, créneaux 30 min ; Samedi/Dimanche fermés.
-- day_of_week suit la convention JS Date.getDay() : 1=Lundi … 5=Vendredi.
-- Idempotence : insertion uniquement si la table est vide (NOT EXISTS).
INSERT INTO "working_hours" ("id", "day_of_week", "start_time", "end_time", "slot_duration", "active", "updated_at")
SELECT gen_random_uuid(), dow, '08:00', '18:00', 30, true, CURRENT_TIMESTAMP
FROM generate_series(1, 5) AS dow
WHERE NOT EXISTS (SELECT 1 FROM "working_hours");
