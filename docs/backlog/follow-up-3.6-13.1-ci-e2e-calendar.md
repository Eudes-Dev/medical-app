# [FOLLOW-UP 3.6 → 13.1] Intégrer le job `e2e-calendar` à la CI

**Story source :** 3.6 (Dette technique — Runner E2E Calendrier)
**Story bloquante :** 13.1 (CI/CD GitHub Actions — *Draft* à date du 2026-05-16)
**Statut :** ouvert, à planifier dès que 13.1 est en cours

## Contexte

La story 3.6 a livré un runner Playwright opérationnel **en local uniquement**
(décision PO 2026-05-16, AC7 figé en "mode différé"). Il n'existe pas encore
de workflow GitHub Actions (`.github/workflows/ci.yml`), c'est l'objet de la
Story 13.1.

## Périmètre du follow-up

Lors de la livraison de 13.1, ajouter un job CI `e2e-calendar` au workflow
principal, comprenant :

- **Service Postgres** GitHub Actions (image `postgres:16`)
- **Cache Playwright browsers** (`~/.cache/ms-playwright`) keyé sur la version de `@playwright/test`
- Étapes :
  1. checkout + setup-node
  2. `npm ci`
  3. `npx playwright install --with-deps chromium`
  4. `cp .env.test.example .env.test` + injection des secrets CI
  5. `npx prisma migrate deploy`
  6. `npm run test:e2e`
- **Artefacts** : upload `playwright-report/` et `test-results/` en cas d'échec
- **Secrets requis** : `SUPABASE_SERVICE_ROLE_KEY_TEST`, `NEXT_PUBLIC_SUPABASE_URL_TEST`, `NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST`

## Acceptance Criteria du follow-up

- [ ] Job `e2e-calendar` ajouté à `.github/workflows/ci.yml`
- [ ] Suite Playwright passe en CI sur les projects `desktop-chromium` et `mobile-chromium`
- [ ] Cache Playwright effectif (vérifier le temps d'exécution avant/après)
- [ ] Documentation `tests/e2e/README.md` mise à jour : retirer la mention "exécution manuelle requise"

## Références

- [Story 3.6](../stories/3.6.dette-runner-e2e-calendrier.story.md)
- [`tests/e2e/README.md`](../../tests/e2e/README.md)
