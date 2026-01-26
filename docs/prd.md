# Product Requirements Document (PRD) - Gestion Médicale (Single-Tenant)

**Version :** 2.0 (Pivot)
**Auteur :** John (Product Manager)
**Statut :** Prêt pour Design & Architecture

## 1. Résumé
Application dédiée à un cabinet médical unique pour la gestion des patients et des rendez-vous, incluant un portail de réservation public sans authentification pour les patients.

## 2. Changements Majeurs
- **Suppression du Multi-tenant :** L'architecture est désormais centralisée sur un seul cabinet.
- **Simplification Data :** Suppression des filtres par `tenant_id`.

## 3. User Stories Prioritaires
- **US.1 :** En tant que praticien, je veux gérer mes disponibilités pour que les patients ne réservent que sur mes heures de travail.
- **US.2 :** En tant que patient (invité), je veux réserver un créneau en 3 clics sans créer de compte.
- **US.3 :** En tant que praticien, je veux voir ma liste de patients et l'historique de leurs rendez-vous.

## 4. Critères d'Acceptation
- Le patient reçoit une confirmation visuelle après validation du formulaire.
- Le praticien peut déplacer un RDV par simple clic (via l'état Zustand).
- Les données sont persistées en base PostgreSQL via Prisma.