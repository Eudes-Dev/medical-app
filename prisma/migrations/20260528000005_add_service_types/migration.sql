-- Story 7.3 : Types de soins paramétrables.
-- Catalogue single-tenant `ServiceType` exposé au tunnel public + FK optionnelle
-- depuis `appointments`. Migration NON destructive : aucun DROP, aucune contrainte
-- NOT NULL ajoutée sur l'existant. `appointments.type` (snapshot) est conservé.

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_types_active_is_public_idx" ON "service_types" ("active", "is_public");

-- AlterTable : ajout de la FK optionnelle (rétro-compatible, RDV legacy = NULL)
ALTER TABLE "appointments" ADD COLUMN "service_type_id" TEXT;

-- CreateIndex
CREATE INDEX "appointments_service_type_id_idx" ON "appointments" ("service_type_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
