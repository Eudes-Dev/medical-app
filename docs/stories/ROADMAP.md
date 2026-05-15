# Roadmap des stories — Application Médicale Single-Tenant

**Date :** 2026-05-15
**Statut :** Feuille de route complète "de A à Z"

Cette feuille de route prolonge le backlog initial (Sprints 1→5) couvrant le MVP, en ajoutant 8 épopées supplémentaires (Sprints 6→17 + Future) nécessaires pour amener le produit à un niveau de qualité, sécurité, conformité et exploitation comparable aux solutions du marché (Doctolib, Maiia, etc.).

## Vue d'ensemble

| Sprint | Épopée | Objectif | Stories |
|---|---|---|---|
| 1 | Fondations & Infra | Setup technique | 1.1, 1.2, 1.3 |
| 2 | Gestion patientèle | CRUD patients | 2.1, 2.2 |
| 3 | Agenda interactif | Vue + créneaux | 3.1, 3.2, 3.3 |
| 4 | Portail public | Tunnel invité | 4.1, 4.2 |
| 5 | Qualité & Déploiement MVP | UX + tests | 5.1, 5.2 |
| **6** | **Notifications** | Emails, SMS, rappels | 6.1, 6.2, 6.3 |
| **7** | **Paramétrage cabinet** | Horaires, congés, services, profil | 7.1, 7.2, 7.3, 7.4 |
| **8** | **Agenda avancé** | Annulation, DnD, vues, récurrents, liste d'attente | 8.1, 8.2, 8.3, 8.4, 8.5 |
| **9** | **Dossier patient** | Notes, docs, antécédents, ordonnances | 9.1, 9.2, 9.3, 9.4 |
| **10** | **Analytics & Export** | KPI, exports, impression | 10.1, 10.2 |
| **11** | **RGPD & Sécurité** | Consentement, droit à l'oubli, audit, chiffrement | 11.1, 11.2, 11.3, 11.4 |
| **12** | **Paiement & Facturation** | Stripe, factures | 12.1, 12.2 |
| **13** | **DevOps & Ops** | CI/CD, Vercel, monitoring, backups, rate limit | 13.1, 13.2, 13.3, 13.4, 13.5 |
| **14** | **Accessibilité & Performance** | WCAG, Lighthouse, PWA | 14.1, 14.2, 14.3 |
| **15** | **Internationalisation** | FR/EN | 15.1 |
| **16** | **Téléconsultation** | Visio | 16.1 |
| **17** | **Lancement** | Bêta, go-live | 17.1, 17.2 |
| **Future** | **Extensions post-MVP** | Multi-praticien, import, sync calendriers | 18.1, 18.2, 18.3 |

## Priorisation suggérée post-MVP

**P0 (avant production payante)**
- 11.1 Consentement RGPD
- 11.3 Audit log
- 13.1 CI/CD
- 13.2 Déploiement Vercel
- 13.3 Monitoring
- 13.4 Backups
- 13.5 Rate limiting
- 6.1 Emails transactionnels
- 7.1 Configuration horaires
- 7.3 Types de soins

**P1 (premiers mois de prod)**
- 6.2 Rappels automatiques
- 7.2 Congés / fériés
- 8.1 Annulation/reprogrammation
- 8.3 Vues Jour/Mois
- 14.1 Accessibilité
- 14.2 Performance
- 11.2 Droit à l'oubli
- 7.4 Page publique cabinet

**P2 (consolidation 3-6 mois)**
- 6.3 SMS
- 8.2 Drag-and-drop
- 9.1 Notes de consultation
- 9.2 Documents
- 10.1 Analytics
- 11.4 Chiffrement applicatif
- 17.1 Bêta

**P3 (différenciation)**
- 8.4, 8.5, 9.3, 9.4, 10.2, 12.1, 12.2, 14.3, 15.1, 16.1, 17.2

**Future (selon traction)**
- 18.1 Multi-praticien
- 18.2 Import Doctolib
- 18.3 Sync Google/Apple Calendar

## Dépendances clés

```
6.1 ─┬─→ 6.2 ─→ 6.3
     └─→ 8.1 ─→ 8.5
7.1 ─→ 7.2 ─→ 8.1
7.3 ─→ 12.1 ─→ 12.2
7.3 ─→ 16.1
11.1 ─→ 11.2 ─→ 11.3 ─→ 11.4
9.2 ─→ 9.4
13.1 ─→ 13.2 ─→ 13.3 ─→ 17.2
14.1 + 14.2 ─→ 17.2
```

## Notes de cadrage

- **Cadre légal FR** : la gestion de données de santé en France exige un hébergement HDS pour les données médicales lourdes (téléconsultation surtout). Supabase n'étant pas HDS, prévoir une migration sur OVH HDS ou Scalingo HDS pour 16.1 et idéalement 11.4.
- **Périmètre MVP rappelé** : les stories 18.x sortent explicitement du périmètre single-tenant défini dans `docs/project-brief.md`. Elles sont listées pour cadrer la vision long terme.
- **Sécurité dès maintenant** : même avant les épopées 11 et 13, vérifier que les Server Actions actuelles (sprint 5) appliquent bien `withAuth` — l'audit story 5.2 doit être finalisé avant tout merge prod.
