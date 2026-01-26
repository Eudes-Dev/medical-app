# 1. Architecture de l'Information (Sitemap)
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
