# ROADMAP — Solution Médicale (Single-Tenant)

> **Reconstruit le 2026-05-30** (PO Sarah) suite au finding **C1** du rapport de validation PO :
> l'ancien `ROADMAP.md` avait été supprimé alors que les stories survivantes (7.1/7.2/7.3, 3.6, 5.2…)
> y renvoyaient comme source vivante. Ce fichier rétablit la référence et **ré-ancre la dette
> transverse** (TZ, rate-limiting, route d'annulation) vers une story propriétaire vivante (**5.3**)
> au lieu de stories supprimées (8.1, 13.x).

## Légende des statuts

| Symbole | Signification |
|---|---|
| ✅ **Done** | Implémenté + QA gate PASS |
| 🔵 **Ready for Review** | Implémenté, gate CONCERNS ou QA non finalisé |
| 🟠 **Dette/bloquant** | Story active de consolidation |
| 📦 **Backlog post-MVP** | Planifié, **descopé du MVP** — n'existe plus comme fichier story (voir `docs/backlog/`) |

---

## Périmètre MVP (épopées 1 → 7) — stories présentes au dépôt

### Épopée 1 — Fondations & Infrastructure
| Story | Titre | Statut |
|---|---|---|
| 1.1 | Initialisation Next.js 16 | 🔵 Ready for Review |
| 1.2 | Couche de données (Prisma & Supabase) | 🔵 Ready for Review |
| 1.3 | Authentification praticien | 🔵 Ready for Review |

### Épopée 2 — Gestion Patientèle
| Story | Titre | Statut |
|---|---|---|
| 2.1 | Dashboard & liste des patients | 🔵 Ready for Review — gate **CONCERNS** (tests P0 manquants) |
| 2.2 | Fiche patient & CRUD | 🔵 Ready for Review — gate PASS |

### Épopée 3 — Agenda Interactif
| Story | Titre | Statut |
|---|---|---|
| 3.1 | State management (Zustand) | ✅ Done — gate PASS |
| 3.2 | Vue calendrier | ✅ Done — gate PASS |
| 3.3 | Gestion des créneaux | 🔵 Ready for Review — gate CONCERNS→PASS demandé |
| 3.6 | **Dette** : runner E2E calendrier | 🔵 Ready for Review — gate créée 2026-05-30 |

> ℹ️ Pas de stories **3.4 / 3.5** : numéros non utilisés (la 3.6 est une story de dette technique). Aucune story manquante.

### Épopée 4 — Portail Public (Tunnel Invité)
| Story | Titre | Statut |
|---|---|---|
| 4.1 | Page de réservation publique | 🔵 Ready for Review — gate CONCERNS (TZ, rate-limit → **5.3**) |
| 4.2 | Flux de réservation « invité » | 🔵 Ready for Review — gate CONCERNS (TZ, rate-limit, CONC-001 → **5.3**) |

> ℹ️ La « story 4.3 (confirmation/annulation) » évoquée dans 4.1/4.2 n'a **jamais existé** comme fichier : l'écran de succès a été livré dans 4.2. Les fonctions d'annulation patient sont reclassées dans **5.3** (route `book/cancel`) et le backlog post-MVP (épopée 8).

### Épopée 5 — Qualité & Déploiement
| Story | Titre | Statut |
|---|---|---|
| 5.1 | Feedback utilisateur (UX) | 🔵 Ready for Review — gate CONCERNS (UI-001 **clos** par [ADR UI](../architecture/4-ui-design-system-decision.md)) |
| 5.2 | Sécurisation & tests E2E | 🔵 Ready for Review — gate créée 2026-05-30 |
| **5.3** | **Consolidation pré-production (TZ, rate-limiting, route d'annulation, migrations)** | 🔵 **Implémenté (commit `c09e8cb`)** — gate QA à finaliser |

### Épopée 6 — Notifications
| Story | Titre | Statut |
|---|---|---|
| 6.1 | Emails transactionnels de confirmation | 🔵 Ready for Done — gate PASS |
| 6.2 | Rappels automatiques de rendez-vous | 🔵 Ready for Review — gate créée 2026-05-30 |
| 6.3 | Notifications SMS (optionnel) | 🔵 Ready for Review — gate PASS (`SMS_ENABLED=false` par défaut) |

### Épopée 7 — Paramétrage Cabinet
| Story | Titre | Statut |
|---|---|---|
| 7.1 | Configuration des horaires d'ouverture | 🔵 Ready for Review — gate CONCERNS (TZ, rate-limit → **5.3**) |
| 7.2 | Congés & jours fériés | 🔵 Ready for Review — gate CONCERNS (idem) |
| 7.3 | Types de soins paramétrables | 🔵 Ready for Review — gate QA à produire |
| 7.4 | Profil cabinet public | 🔵 Ready for Review — *hand-off 7.1 clos (label horaires dérivé de `WorkingHours`) + `CABINET_INFO`/« Cabinet Rive Gauche » codés en dur supprimés des surfaces publiques ; e-mails migrés sur le profil persisté* |

---

## 🟠 Dette transverse pré-production — propriété de la story 5.3

Ces points étaient « tracés » vers des stories **supprimées** (13.5, 8.1). Ils sont désormais **regroupés et possédés par la story 5.3** :

| ID | Symptôme | Origine | Bloquant prod |
|---|---|---|---|
| **REL-001** | Génération de créneaux en TZ serveur (`setHours`) → décalage 1-2 h sur Vercel UTC | 4.1/4.2/7.1/7.2 | **Oui** |
| **SEC-001** | Aucun rate limiter sur `getAvailableSlots` / `createGuestBooking` (actions publiques) | 4.1/4.2 | **Oui** |
| **CANCEL-ROUTE-001** | Lien `…/book/cancel?token=` des emails (6.1) et SMS (6.3) → **404** (route inexistante) | 6.1/6.3 | **Oui** |
| **OPS-001** | Migrations non appliquées en prod + flux `db push`/`migrate resolve` fragile | 6.x/7.1 | **Oui** |
| **TEST-BASELINE-001** | 5-7 tests « pré-existants » rouges tolérés (dont régression réelle 3.3-INT-008/009) | 3.3+/6.x | Non (mais masque les régressions) |

➡️ Voir [`docs/stories/5.3.consolidation-pre-prod.story.md`](./5.3.consolidation-pre-prod.story.md) et [`docs/dette/`](../dette/).

---

## 📦 Backlog post-MVP (épopées 8 → 18) — descopées, non livrées

Ces stories ont été **retirées du dépôt** ; elles sont conservées ici comme intention produit. Les références « story X » dans les stories MVP renvoient à ce backlog (et **non** à des fichiers manquants).

| Épopée | Stories | Thème |
|---|---|---|
| 8 | ~~8.1 annulation/reprogrammation~~ **→ promue au périmètre actif (Approved, 2026-06-04)** · 8.2 drag-and-drop · 8.3 vues jour/mois · 8.4 RDV récurrents · 8.5 liste d'attente | Agenda avancé |
| 9 | 9.1 notes de consultation **(Done)** · 9.2 documents médicaux **(Done — prod conditionnée RGPD)** · 9.3 antécédents | Dossier patient |
| 10 | 10.1 statistiques avancées · 10.2 export données | Analytics |
| 11 | 11.1 consentement RGPD · 11.2 droit à l'oubli/export · 11.3 journal d'audit · 11.4 chiffrement | RGPD / Sécurité |
| 12 | 12.1 acompte Stripe · 12.2 facturation PDF | Paiement (dépend de 7.3) |
| 13 | 13.1 CI/CD GitHub Actions · 13.2 déploiement Vercel · 13.3 monitoring Sentry · 13.4 backups DB · **13.5 rate-limiting** | DevOps / Sécu infra |
| 14 | 14.1 accessibilité WCAG · 14.2 performance Lighthouse · 14.3 PWA | Qualité avancée |
| 15 | 15.1 i18n FR/EN | Internationalisation |
| 16 | 16.1 téléconsultation visio | Télémédecine (dépend de 7.3) |
| 17 | 17.1 bêta-test · 17.2 lancement marketing | Go-to-market |
| 18 | 18.1 multi-praticien · 18.2 import Doctolib · 18.3 sync Google Calendar | Multi-tenant & intégrations |

> ⚠️ **Note de cadrage importante :** une partie de la sécurité prod historiquement prévue en épopée 13 (rate-limiting **13.5**) et l'annulation patient (**8.1**) sont **avancées dans le périmètre MVP via la story 5.3**, car elles sont **bloquantes** pour exposer le tunnel public en production. Le reste de l'épopée 13 (CI, Vercel, Sentry, backups) reste post-MVP mais doit être planifié rapidement (la suite E2E des stories 3.6/5.2 n'est pas exécutée en CI tant que 13.1 n'existe pas).

## Chaîne de dépendances clé (mise à jour)

```
1.x → 2.x → 3.x → 4.1 → 4.2 → 5.1 → 5.2 → 5.3 (BLOQUANT PROD)
                                  ↘ 6.1 → 6.2 → 6.3
7.1 → 7.2 → (8.1 backlog)
7.3 → (12.1 backlog, 16.1 backlog)
```

## Change Log
| Date | Version | Description | Auteur |
|---|---|---|---|
| 2026-05-30 | 1.0 | Reconstruction du ROADMAP supprimé. Ré-ancrage de la dette transverse vers la story 5.3. Reclassement explicite des épopées 8→18 en backlog post-MVP. | PO (Sarah) |
| 2026-06-04 | 1.1 | Statut 5.3 réconcilié (périmètre mergé, commit `c09e8cb`). Story 8.1 (reprogrammation patient self-service) promue du backlog au périmètre actif (Approved) ; 8.2→8.5 restent au backlog. | PO (Sarah) |
| 2026-06-25 | 1.2 | Épopée 9 ouverte : 9.1 (notes) et 9.2 (documents médicaux) → Done. ADR §5 « Stockage de fichiers » acté ([architecture/5](../architecture/5-stockage-fichiers-decision.md)). 9.2 : mise en production conditionnée à un arbitrage RGPD (épopée 11). | Architect / SM / Dev / QA (boucle BMAD) |
