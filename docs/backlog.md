# Backlog de Développement: Solution Médicale (Single-Tenant)

**Projet :** Gestion de Cabinet Médical Solo
**Version Framework :** Next.js 16.x (App Router)
**Agent :** Sarah (Product Owner)
**Statut :** Prêt pour Développement

---

## 📅 SPRINT 1 : Fondations & Infrastructure
*Objectif : Mettre en place un environnement de développement robuste et sécurisé.*

- [ ] **Ticket 1.1 : Initialisation Next.js 16**
  - Setup du projet avec `npx create-next-app@latest` (v16).
  - Configuration de TypeScript, TailwindCSS et ESLint.
  - Installation et initialisation de **Shadcn UI**.
- [ ] **Ticket 1.2 : Couche de Données (Prisma & Supabase)**
  - Initialisation de Prisma.
  - Configuration de la connexion PostgreSQL avec Supabase.
  - Création et migration du schéma (User, Patient, Appointment).
- [ ] **Ticket 1.3 : Authentification Praticien**
  - Configuration de **Supabase Auth**.
  - Création de la page de login pour le praticien.
  - Sécurisation des routes `/dashboard/**` via Middleware.

## 📅 SPRINT 2 : Gestion Patientèle
*Objectif : Permettre au praticien de gérer sa base de données patients.*

- [ ] **Ticket 2.1 : Dashboard & Liste des Patients**
  - Création de la table interactive (Shadcn Data Table).
  - Implémentation de la recherche et de la pagination.
- [ ] **Ticket 2.2 : Fiche Patient & CRUD**
  - Formulaire de création/édition de patient.
  - Validation stricte des champs (Nom, Prénom, Tel, Email) avec **Zod**.
  - Server Action pour la persistance des données.

## 📅 SPRINT 3 : Agenda Interactif
*Objectif : Développer le cœur métier pour la gestion des rendez-vous.*

- [ ] **Ticket 3.1 : State Management (Zustand)**
  - Création du store `useCalendarStore` pour gérer la date pivot et les filtres de vue.
- [ ] **Ticket 3.2 : Vue Calendrier**
  - Développement de la grille de l'agenda (Vue Semaine/Jour).
  - Affichage des rendez-vous existants.
- [ ] **Ticket 3.3 : Gestion des Créneaux**
  - Modal de prise de rendez-vous rapide depuis l'agenda.
  - Server Action pour gérer les conflits d'horaires.

## 📅 SPRINT 4 : Portail Public (Tunnel Invité)
*Objectif : Ouvrir la prise de RDV aux patients sans friction.*

- [ ] **Ticket 4.1 : Page de Réservation Publique**
  - Route statique `/book` (architecture single-tenant).
  - Interface de sélection de créneau optimisée mobile.
- [ ] **Ticket 4.2 : Flux de Réservation "Invité"**
  - Formulaire simplifié (Identité + Coordonnées).
  - Logique de vérification : si l'email existe déjà, lier le RDV au patient existant.
  - Écran de succès et récapitulatif du rendez-vous.

## 📅 SPRINT 5 : Qualité & Déploiement
*Objectif : Finaliser l'expérience utilisateur et préparer la mise en production.*

- [ ] **Ticket 5.1 : Feedback Utilisateur (UX)**
  - Implémentation des Skeletons pour les chargements de l'agenda.
  - Toasts de notification pour chaque action (Succès/Erreur).
- [ ] **Ticket 5.2 : Sécurisation & Tests**
  - Vérification des permissions sur toutes les Server Actions.
  - Tests de bout en bout sur le flux de réservation invité.