-- Story 8.4 : Rendez-vous récurrents.
-- Ajoute un identifiant de série `series_id` (UUID opaque, nullable) qui groupe
-- les occurrences d'un RDV récurrent. Migration NON destructive : colonne nullable
-- ajoutée + index ; aucun DROP, aucune contrainte NOT NULL sur l'existant.
-- Rétro-compatibilité totale : tous les RDV existants restent `series_id = NULL`
-- (= RDV non récurrent). Pas de modèle `RecurrenceSeries` séparé ni de stockage
-- de la règle de fréquence (modèle léger assumé — cf. Dev Notes 8.4).

-- AlterTable : ajout de la colonne de série (rétro-compatible, RDV non récurrents = NULL)
ALTER TABLE "appointments" ADD COLUMN "series_id" TEXT;

-- CreateIndex : groupement/filtrage des occurrences d'une même série
CREATE INDEX "appointments_series_id_idx" ON "appointments" ("series_id");
