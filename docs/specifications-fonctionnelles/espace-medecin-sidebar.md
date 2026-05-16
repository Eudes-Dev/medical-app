# Espace Médecin — Inventaire complet du Dashboard

**Date :** 2026-05-16
**Source :** Synthèse PRD, front-end-spec et roadmap des 18 épics
**Statut :** Référence fonctionnelle

Ce document énumère l'intégralité des onglets et fonctionnalités que le praticien doit retrouver dans son espace privé, à l'échelle complète du projet (MVP + roadmap).

---

## Sidebar — Onglets du Dashboard Médecin

### 1. Vue d'ensemble — `/dashboard`
- KPIs du jour : nb RDV, nouveaux patients, taux de remplissage, no-shows
- Prochains RDV (timeline live)
- Alertes : RDV non confirmés, liste d'attente, documents en attente
- Raccourcis : nouveau RDV, nouveau patient, bloquer un créneau

### 2. Agenda / Calendrier — `/dashboard/calendar`
- Vues Jour / Semaine / Mois (story 8.3)
- Drag & drop pour reprogrammer (story 8.2)
- Création/édition de créneaux (story 3.3)
- Annulation & reprogrammation avec motif (story 8.1)
- RDV récurrents (story 8.4)
- Filtres : type de soin, statut, patient
- Synchronisation Google Calendar (story 18.3)

### 3. Patients — `/dashboard/patients`
- Liste paginée + recherche (story 2.1)
- Fiche patient CRUD (story 2.2) avec sous-onglets :
  - **Infos** (coordonnées, NSS, médecin traitant)
  - **Historique RDV**
  - **Antécédents médicaux** (story 9.3) : allergies, traitements, ATCD chirurgicaux/familiaux
  - **Notes de consultation** (story 9.1)
  - **Documents médicaux** (story 9.2) : upload ordonnances, analyses, imagerie
  - **Ordonnances PDF** générées (story 9.4)
  - **Facturation** (historique des paiements/factures)
  - **RGPD** : consentement, export, droit à l'oubli (stories 11.1, 11.2)

### 4. Liste d'attente — `/dashboard/waitlist` (story 8.5)
- Patients en attente d'un créneau, proposition automatique en cas d'annulation

### 5. Téléconsultation — `/dashboard/teleconsultation` (story 16.1)
- Salle virtuelle, RDV visio du jour, lien d'invitation

### 6. Communication — `/dashboard/communication`
- Emails transactionnels envoyés (story 6.1)
- Rappels automatiques configurables (story 6.2)
- SMS et templates (story 6.3)
- Journal d'envois

### 7. Facturation — `/dashboard/billing`
- Acomptes Stripe (story 12.1)
- Génération de factures PDF (story 12.2)
- Encaissements, impayés, exports comptables

### 8. Statistiques — `/dashboard/analytics` (story 10.1)
- CA, fréquentation, no-show rate, types de soins les plus demandés
- Export CSV / Excel (story 10.2)

### 9. Paramètres — `/dashboard/settings`
Sous-sections :
- **Profil cabinet public** (story 7.4) : présentation, photos, adresse, accès
- **Horaires d'ouverture** (story 7.1)
- **Congés & jours fériés** (story 7.2)
- **Types de soins** (story 7.3) : durée, tarif, couleur
- **Compte praticien** : profil, mot de passe, 2FA
- **Notifications** : préférences email/SMS
- **Intégrations** : Google Calendar, import Doctolib (story 18.2)
- **Langue** FR/EN (story 15.1)
- **RGPD & Sécurité** : journal d'audit (story 11.3), chiffrement (story 11.4)
- **Facturation Stripe** : clés, TVA, mentions légales

### 10. Aide & Support (pied de sidebar)
- Documentation, raccourcis clavier, contact support, version + statut système (Sentry/monitoring, story 13.3)

---

## Éléments transverses (header / global)

- **Recherche globale** (⌘K) : patients, RDV, documents
- **Notifications cloche** : nouveaux RDV, annulations, rappels
- **Bouton "+ Nouveau"** : RDV / Patient / Blocage agenda
- **Sélecteur de date rapide**
- **Avatar praticien** → profil, paramètres, déconnexion
- **Indicateur PWA / mode hors-ligne** (story 14.3)

---

## Hors-MVP mais prévu roadmap

- **Multi-praticiens** (story 18.1) → ajoute un sélecteur de praticien dans la sidebar
- **Import Doctolib** → assistant de migration dans Paramètres

---

## Périmètre MVP (Phase 1)

Le MVP couvre uniquement :
- Vue d'ensemble
- Agenda
- Patients (fiches basiques)
- Paramètres (horaires + types de soins)

Le reste relève des épics 6 à 18 livrés progressivement selon la [ROADMAP](../stories/ROADMAP.md).
