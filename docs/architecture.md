# Architecture Technique (Single-Tenant) - v2.0

**Statut :** Épuré ✅
**Stack :** Next.js (App Router), Prisma, PostgreSQL, Zustand.

## 1. Structure Globale
L'application est conçue pour un déploiement unique. Toutes les données en base appartiennent au même cabinet.

## 2. Logique de Données
- **Relations :** Patient (1) <---> (N) Appointment.
- **Accès :** Couche de services via Next.js Server Actions.

## 3. Gestion d'État (Zustand)
Le store `useCalendarStore` reste identique car il gère l'UI, mais sa synchronisation avec le serveur est simplifiée par l'absence de scope "Tenant".