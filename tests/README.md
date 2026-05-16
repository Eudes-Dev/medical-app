# Tests

Ce répertoire regroupe l'ensemble des tests automatisés du projet.

## Structure

```
tests/
├── setup.ts                # Configuration globale Vitest
├── unit/                   # Tests unitaires (Vitest)
├── integration/            # Tests d'intégration Server Actions (Vitest)
├── component/              # Tests composant React Testing Library (Vitest)
└── e2e/                    # Tests end-to-end Playwright (story 3.6)
    ├── calendar/           # Specs Playwright pour le module calendrier
    ├── helpers/            # Helpers (auth, fixtures)
    ├── global-setup.ts     # Reset DB + seed + auth avant la suite
    └── README.md
```

> **Note historique** : avant la story 3.6, `tests/e2e/` contenait en réalité des tests composant Testing Library. Ils ont été déplacés vers `tests/component/` (PO décision 2026-05-16) afin de libérer `tests/e2e/` au profit des vrais tests E2E Playwright.

## Commandes

| Commande | Description |
|---|---|
| `npm test` | Exécute Vitest en mode watch (unit + integration + component) |
| `npm run test:run` | Exécute Vitest une fois |
| `npm run test:unit` | Vitest sur `tests/unit/` |
| `npm run test:integration` | Vitest sur `tests/integration/` |
| `npm run test:component` | Vitest sur `tests/component/` |
| `npm run test:e2e` | Playwright sur `tests/e2e/` (voir `tests/e2e/README.md`) |

## Références

- Test designs : `docs/qa/assessments/*-test-design-*.md`
- Quality gates : `docs/qa/gates/*.yml`
