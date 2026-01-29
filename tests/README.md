# Tests - Story 2.1

Ce répertoire contient tous les tests pour la story 2.1 (Dashboard & Liste des Patients).

## Structure

```
tests/
├── setup.ts                          # Configuration globale des tests
├── unit/                             # Tests unitaires
│   ├── hooks/
│   │   └── use-debounce.test.tsx    # Test ID: 2.1-UNIT-002
│   └── components/
│       └── patient-data-table.test.tsx # Test IDs: 2.1-UNIT-001, 2.1-UNIT-003, 2.1-UNIT-004
├── integration/                      # Tests d'intégration
│   ├── dashboard/
│   │   └── actions.test.ts          # Test IDs: 2.1-INT-001, 2.1-INT-002, 2.1-INT-003, 2.1-INT-010
│   └── patients/
│       └── actions.test.ts          # Test IDs: 2.1-INT-004 à 2.1-INT-010, 2.1-INT-013
└── e2e/                              # Tests end-to-end
    ├── dashboard/
    │   └── dashboard-stats.test.tsx # Test ID: 2.1-E2E-001
    └── patients/
        ├── patient-data-table.test.tsx      # Test IDs: 2.1-E2E-002, 2.1-E2E-003, 2.1-E2E-005
        ├── patients-table-wrapper.test.tsx  # Test ID: 2.1-E2E-004
        └── patient-table-skeleton.test.tsx # Test ID: 2.1-E2E-006
```

## Exécution des tests

### Tous les tests
```bash
npm test
```

### Interface utilisateur (mode watch)
```bash
npm run test:ui
```

### Exécution unique (CI)
```bash
npm run test:run
```

### Tests spécifiques
```bash
# Tests unitaires uniquement
npm test -- tests/unit

# Tests d'intégration uniquement
npm test -- tests/integration

# Tests E2E uniquement
npm test -- tests/e2e

# Un fichier spécifique
npm test -- tests/unit/hooks/use-debounce.test.tsx
```

## Couverture des tests

### Tests P0 (Critiques) - 8 tests
- ✅ 2.1-UNIT-002: useDebounce retarde la mise à jour de 300ms
- ✅ 2.1-INT-001: getDashboardStats retourne les RDV du jour
- ✅ 2.1-INT-002: getDashboardStats retourne les 5 prochains RDV
- ✅ 2.1-INT-004: getPatients retourne tous les patients sans filtre
- ✅ 2.1-INT-005: getPatients filtre par firstName
- ✅ 2.1-INT-006: getPatients filtre par lastName
- ✅ 2.1-INT-007: getPatients filtre par email
- ✅ 2.1-INT-008: getPatients retourne 10 résultats avec pagination
- ✅ 2.1-INT-010: Authentification vérifiée (Server Actions)
- ✅ 2.1-E2E-002: Page patients affiche la table avec données

### Tests P1 (Haute priorité) - 5 tests
- ✅ 2.1-INT-003: getDashboardStats filtre par statut
- ✅ 2.1-INT-009: getPatients retourne le total correct
- ✅ 2.1-INT-013: Recherche insensible à la casse
- ✅ 2.1-UNIT-003: PatientDataTable gère la pagination
- ✅ 2.1-UNIT-004: PatientDataTable génère les liens corrects
- ✅ 2.1-E2E-001: Dashboard affiche les statistiques
- ✅ 2.1-E2E-003: Table utilise les styles Shadcn UI
- ✅ 2.1-E2E-004: Recherche filtre en temps réel
- ✅ 2.1-E2E-005: Clic sur "Voir" navigue vers la fiche

### Tests P2 (Moyenne priorité) - 2 tests
- ✅ 2.1-UNIT-001: PatientDataTable rend les colonnes
- ✅ 2.1-E2E-006: Skeleton s'affiche pendant le chargement

## Notes

- Les tests d'intégration utilisent des mocks pour Supabase Auth et Prisma
- Les tests E2E testent les composants React avec React Testing Library
- Pour les vrais tests E2E avec navigateur, considérer Playwright ou Cypress (story future)

## Références

- Test Design: `docs/qa/assessments/2.1-test-design-20260129.md`
- Quality Gate: `docs/qa/gates/2.1-dashboard-liste-patients.yml`
