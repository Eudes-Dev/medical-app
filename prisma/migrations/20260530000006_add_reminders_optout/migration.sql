-- Migration : Rappels automatiques + opt-out (story 6.2)
-- ----------------------------------------------------------------------------
-- MATÉRIALISATION TARDIVE (story 5.3 / finding OPS-001).
--
-- Les champs ci-dessous (story 6.2) avaient été appliqués en dev via
-- `prisma db push` SANS jamais être matérialisés en fichier de migration. Sur
-- une base neuve, `prisma migrate deploy` ne les aurait donc pas créés → le cron
-- de rappels (6.2) et le lien de désinscription auraient échoué en production.
--
-- Cette migration reconstitue exactement ce diff. Elle est volontairement
-- **idempotente** (`IF NOT EXISTS`) afin d'être :
--   - sans effet sur une base déjà alignée (dev, où `db push` a déjà créé ces
--     objets) — à marquer alors `prisma migrate resolve --applied 20260530000006_add_reminders_optout` ;
--   - applicable proprement sur une base neuve (prod) via `prisma migrate deploy`.

-- 1. Valeurs d'enum MessageType pour les rappels (story 6.2).
--    (L'enum a été renommé EmailType → MessageType en 6.3 ; il existe donc
--     déjà sous ce nom à ce stade de l'historique.)
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'REMINDER_D1';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'REMINDER_H2';

-- 2. Opt-out des rappels et token de désinscription sur le patient.
ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "reminder_opt_out" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "opt_out_token" TEXT NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "patients_opt_out_token_key"
  ON "patients" ("opt_out_token");

-- 3. Horodatages des rappels envoyés sur le rendez-vous (J-1 / H-2).
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "reminder_d1_sent_at" TIMESTAMP(3);
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "reminder_h2_sent_at" TIMESTAMP(3);
