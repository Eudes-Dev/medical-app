# Front-End Specification: Application Médicale Single-Tenant

**Agent :** Sally (UX Expert)
**Statut :** Validé (Mis à jour - Pivot Single-Tenant)
**Date :** 25 Janvier 2026

## 1. Architecture de l'Information (Sitemap)
L'application est découpée en deux environnements distincts basés sur le rôle de l'utilisateur.

### A. Espace Public (Patient Invité)
- `/` : Landing page du cabinet (présentation, horaires, contact).
- `/book` : Tunnel de prise de rendez-vous.
    - Étape 1 : Sélection du motif et du créneau.
    - Étape 2 : Formulaire d'identité (Mode Invité).
    - Étape 3 : Confirmation et récapitulatif.

### B. Espace Privé (Praticien - Dashboard)
- `/dashboard` : Vue d'ensemble (statistiques du jour, prochains RDV).
- `/dashboard/calendar` : Agenda interactif (vue jour/semaine/mois).
- `/dashboard/patients` : Gestion de la base patient (recherche, fiches détaillées).
- `/dashboard/settings` : Configuration du cabinet (horaires, types de soins).

## 2. Design System & UI Components
Utilisation de **TailwindCSS** et **Shadcn UI** pour une interface propre et professionnelle.

### Palette de Couleurs
- **Principal :** `Blue-600` (#2563eb) - Actions primaires et santé.
- **Neutre :** `Slate-900` (#0f172a) - Typographie et headers.
- **Succès :** `Emerald-500` - Rendez-vous confirmés.
- **Alerte :** `Amber-500` - En attente ou modification.
- **Erreur :** `Rose-500` - Annulations et erreurs de formulaire.

### Composants Clés
- **Calendar Engine :** Basé sur une grille CSS custom pour une fluidité maximale sur desktop et mobile.
- **Drawer (Vaul) :** Utilisé sur mobile pour la prise de RDV rapide.
- **Modals :** Pour les formulaires de création de patient sans quitter le contexte actuel.

## 3. Gestion de l'État (Zustand)
Le store `useCalendarStore` gérera :
- La date pivot de l'affichage.
- Les filtres de vue (ex: masquer les RDV annulés).
- Le cache local pour permettre des transitions instantanées entre les jours.

## 4. Stratégie de Validation (Zod)
- **Côté Client :** Feedback immédiat sous les champs de saisie (ex: format email, téléphone obligatoire).
- **Côté Serveur :** Double vérification dans les Next.js Server Actions avant insertion en base.

## 5. Expérience "Invité" (Guest Flow)
1. Le patient ne voit jamais d'écran de "Login" pour prendre RDV.
2. Saisie simplifiée : Prénom, Nom, Téléphone, Email.
3. Après validation, un cookie temporaire permet au patient de voir son récapitulatif sans compte.