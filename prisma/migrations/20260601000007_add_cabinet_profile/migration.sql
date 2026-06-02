-- Story 7.4 : Profil cabinet public.
-- Modèle single-tenant `CabinetProfile` (une seule ligne — singleton). Remplace
-- l'identité publique codée en dur `CABINET_INFO` (lib/cabinet/config.ts).
-- Migration NON destructive : CREATE TABLE uniquement + seed d'amorçage idempotent.

-- CreateTable
CREATE TABLE "cabinet_profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "access_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinet_profile_pkey" PRIMARY KEY ("id")
);

-- Seed d'amorçage (décision PO) : reprend les valeurs actuelles de `CABINET_INFO`
-- pour ne pas afficher un profil vide au premier déploiement. Le praticien édite
-- ensuite depuis /dashboard/settings/profile.
-- Idempotence : insertion uniquement si la table est vide (NOT EXISTS).
INSERT INTO "cabinet_profile" ("id", "name", "address", "phone", "updated_at")
SELECT gen_random_uuid(), 'Cabinet Médical', '12 rue de la Santé, 75014 Paris', '01 23 45 67 89', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "cabinet_profile");
