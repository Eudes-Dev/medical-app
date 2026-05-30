# Prérequis d'exécution Playwright — non automatisables côté code

## Origine
Story 3.6 — Runner E2E Calendrier (livraison 2026-05-16).

## Symptôme
Le code, la configuration Playwright, le seed et les 11 scénarios E2E (3.1, 3.2, 3.3) sont livrés et type-check OK. Cependant `npm run test:e2e` ne peut pas être exécuté **en l'état** sur une machine fraîche : trois prérequis d'environnement restent à la charge de la personne qui lance la suite.

## Cause racine
Ces éléments dépendent d'infrastructure externe (Postgres, projet Supabase, binaires navigateurs) et ne peuvent pas être committés dans le dépôt.

## À faire (checklist runner)
- [ ] **`.env.test`** — copier `.env.test.example` puis renseigner :
  - `DATABASE_URL_TEST` / `DIRECT_URL_TEST` pointant vers une base Postgres isolée (recommandé : `medical_app_test`). Le garde-fou refuse toute URL contenant `prod` ou `production`.
  - `NEXT_PUBLIC_SUPABASE_URL_TEST`, `NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST`, `SUPABASE_SERVICE_ROLE_KEY_TEST` — idéalement un **projet Supabase distinct** du projet de dev (sinon le seed E2E créera/écrasera l'utilisateur `practitioner-e2e@test.local` dans le projet dev).
  - `E2E_PRACTITIONER_EMAIL` / `E2E_PRACTITIONER_PASSWORD` (valeurs par défaut acceptables).
- [ ] **Base Postgres locale** créée et accessible (`createdb medical_app_test` ou équivalent).
- [ ] **Binaires Playwright** installés : `npx playwright install chromium` (~150 Mo). Non scriptable au `postinstall` du package (volontairement) pour ne pas alourdir un `npm ci` standard.

## Piste de correction
- À court terme : conserver l'exécution manuelle (acté AC7 Story 3.6, "mode différé" en attendant 13.1).
- À moyen terme (Story 13.1) : tout cela passe dans le job CI `e2e-calendar` (service Postgres GH Actions + secrets repo + cache Playwright browsers). Le ticket de suivi est tracé dans [`docs/backlog/follow-up-3.6-13.1-ci-e2e-calendar.md`](../backlog/follow-up-3.6-13.1-ci-e2e-calendar.md).

## Impact si non traité
- **Avant 13.1** : les AC d'ergonomie / persistance des stories 3.1, 3.2, 3.3 restent validés uniquement par revue manuelle sur la machine de dev. Risque de régression silencieuse entre deux livraisons calendrier.
- **Après 13.1 sans CI activée** : la dette technique 3.6 demeure ouverte malgré la disponibilité du job.

## Journal d'exécution

### 2026-05-30 — Tentative (story 5.3, Task 6 / AC 14)
- **Commande** : `npm run test:e2e`.
- **Résultat** : **bloqué au `global-setup`**, avant tout scénario, par un prérequis d'environnement (pas une régression de code) :
  ```
  Error: DATABASE_URL_TEST manquante (cf. .env.test.example).
    at tests/e2e/global-setup.ts:22
  ```
- **Cause** : `.env.test` **absent** de la sandbox de dev ; la base Supabase de dev est par ailleurs injoignable (`P1001`). Les trois prérequis ci-dessus (base Postgres `medical_app_test` isolée, projet Supabase de test, binaires Playwright) ne sont pas réunis dans cet environnement.
- **Conséquence** : aucun scénario n'a pu s'exécuter ; **aucun scénario rouge** à tracer (l'arrêt est antérieur au lancement des tests). La validation reste à faire par un runner disposant de l'infra de test, ou via le job CI de la story 13.1.
- **Conforme** au mode différé acté (AC7 story 3.6) et à AC 11/14 de la story 5.3 (aucune action sur une base live depuis la story de dev).

## Références
- [Story 3.6](../stories/3.6.dette-runner-e2e-calendrier.story.md)
- [tests/e2e/README.md](../../tests/e2e/README.md)
- [docs/backlog/follow-up-3.6-13.1-ci-e2e-calendar.md](../backlog/follow-up-3.6-13.1-ci-e2e-calendar.md)
