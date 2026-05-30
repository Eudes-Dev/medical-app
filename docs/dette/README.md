# Dette technique

Ce dossier référence les éléments de dette technique identifiés mais reportés à plus tard, hors du scope immédiat des stories en cours.

Chaque entrée doit préciser :
- L'origine (story / contexte de détection)
- Le symptôme observable
- La cause racine si connue
- La piste de correction proposée
- L'impact si non traité

## Index

- [2026-05-30 — bloquants-pre-prod.md](./2026-05-30-bloquants-pre-prod.md) — **BLOQUANTS PROD consolidés** (REL-001 TZ, SEC-001 rate-limit, CANCEL-ROUTE-001 404, OPS-001 migrations, TEST-BASELINE-001). Propriétaire : [Story 5.3](../stories/5.3.consolidation-pre-prod.story.md).
- [2026-05-30 — procedure-migration-prod.md](./2026-05-30-procedure-migration-prod.md) — Procédure `prisma migrate deploy` + seed `working_hours` au déploiement (OPS-001).
- [2026-05-16 — tests-residuels-suite-vitest.md](./2026-05-16-tests-residuels-suite-vitest.md) — 5 tests cassés résiduels dans la suite vitest (use-debounce, dashboard-stats E2E) hors scope Story 3.3. → repris par Story 5.3 (TEST-BASELINE-001).
- [2026-05-16 — prerequis-execution-e2e-playwright.md](./2026-05-16-prerequis-execution-e2e-playwright.md) — Prérequis runner E2E (`.env.test`, Postgres `medical_app_test`, `npx playwright install`) à la charge de l'opérateur tant que la CI 13.1 n'est pas livrée. → exécution à consigner via Story 5.3 (AC 14).

> Vue d'ensemble de la planification et du reclassement post-MVP : [docs/stories/ROADMAP.md](../stories/ROADMAP.md).
