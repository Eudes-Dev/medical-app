# Project Brief: Solution de Gestion Médicale (Cabinet Unique)

**Agent :** Mary (Business Analyst)
**Statut :** Mis à jour (Pivot Single-Tenant)
**Date :** 25 Janvier 2026

## 1. Vision du Projet
Développement d'une application de gestion de rendez-vous sur mesure pour un cabinet médical solo. L'accent est mis sur la simplicité d'utilisation, la rapidité de prise de RDV et l'efficacité de l'agenda praticien.

## 2. Objectifs Business
* **Digitalisation :** Remplacer le carnet papier par un outil cloud accessible partout.
* **Accessibilité :** Permettre aux patients de prendre RDV 24h/24 sans intervention humaine.

## 3. Périmètre du MVP (Phase 1)
* **Authentification :** Accès sécurisé pour le praticien via Supabase.
* **Gestion des Patients :** Base de données centralisée des patients du cabinet.
* **Agenda Praticien :** Interface de gestion des créneaux (Zustand).
* **Prise de RDV Invité :** Tunnel public pour les patients sans création de compte.

## 4. Stack Technique
* Next.js, Prisma, PostgreSQL (Supabase), TailwindCSS, Shadcn UI.