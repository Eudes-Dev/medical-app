-- Story 9.4 : Historique des rendez-vous (dossier patient, épopée 9).
-- Ajoute trois colonnes optionnelles à `appointments` pour alimenter le
-- panneau dépliable de l'historique RDV : `motif`, `modalite`, `lieu`.
-- Le champ « Note » réutilise la colonne existante `appointments.notes`.
-- Migration NON destructive : aucun DROP, aucune modification des colonnes
-- existantes. Tout rendez-vous existant reste inchangé (nouvelles colonnes NULL).

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "motif" TEXT;
ALTER TABLE "appointments" ADD COLUMN "modalite" TEXT;
ALTER TABLE "appointments" ADD COLUMN "lieu" TEXT;
