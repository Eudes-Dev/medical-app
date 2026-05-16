# Tests E2E Playwright — Calendrier (Story 3.6)

Suite end-to-end couvrant le module calendrier (Stories 3.1, 3.2, 3.3).
Issue de la story de dette technique **3.6** — voir
[docs/stories/3.6.dette-runner-e2e-calendrier.story.md](../../docs/stories/3.6.dette-runner-e2e-calendrier.story.md).

## ⚠️ Statut CI

**Exécution manuelle requise jusqu'à la livraison de la Story 13.1 (CI/CD GitHub Actions).**
Aucun workflow `.github/workflows/ci.yml` n'existe à date ; le job
`e2e-calendar` (service Postgres + cache Playwright browsers) sera ajouté
dans la 13.1. Un ticket de suivi est tracé dans
[`docs/backlog/follow-up-3.6-13.1-ci-e2e-calendar.md`](../../docs/backlog/follow-up-3.6-13.1-ci-e2e-calendar.md).

## Prérequis

- **Node.js** ≥ 20
- **PostgreSQL** local accessible (recommandé : base/schema dédié `medical_app_test`)
- **Projet Supabase** (idéalement distinct du dev) avec la `service_role key`
- Navigateurs Playwright installés : `npx playwright install chromium`

## Configuration

1. Copier `.env.test.example` → `.env.test`
2. Renseigner :
   - `DATABASE_URL_TEST` / `DIRECT_URL_TEST` (Postgres isolé — refus si contient `prod`)
   - `NEXT_PUBLIC_SUPABASE_URL_TEST`, `NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST`, `SUPABASE_SERVICE_ROLE_KEY_TEST`
   - `E2E_PRACTITIONER_EMAIL` / `E2E_PRACTITIONER_PASSWORD` (utilisés par le seed et le helper d'auth)

## Commandes

| Commande | Description |
|---|---|
| `npm run test:e2e:db:reset` | `prisma migrate reset --force --skip-seed` puis `prisma/seed-e2e.ts` |
| `npm run test:e2e` | Lance la suite Playwright (projects `desktop-chromium` + `mobile-chromium`) |
| `npm run test:e2e:ui` | Mode interactif Playwright UI |

Le `globalSetup` :
1. recharge `.env.test`,
2. applique le garde-fou anti-prod sur `DATABASE_URL_TEST`,
3. déclenche `test:e2e:db:reset`,
4. authentifie le praticien via le formulaire `/login` et sauve un `storageState.json`
   réutilisé par tous les projects Playwright.

## Conventions

- **Arborescence** : `tests/e2e/calendar/<story>-<thème>.spec.ts`
- **IDs scénarios** : commentaire `// AC: 3.x-E2E-NNN` au-dessus de chaque `test()`
- **Sélecteurs** : `getByRole` / `getByLabel` / `getByTestId` (préférer ajouter un `data-testid` plutôt qu'un sélecteur CSS fragile)
- **DB** : ne JAMAIS modifier la dev DB ; tout passe par `prisma/seed-e2e.ts`
- **Auth** : storageState partagé via `global-setup.ts` ; ne pas réauthentifier dans les tests

## Références

- [docs/qa/assessments/3.1-test-design-20260129.md](../../docs/qa/assessments/3.1-test-design-20260129.md)
- [docs/qa/assessments/3.2-test-design-20260129.md](../../docs/qa/assessments/3.2-test-design-20260129.md)
- [docs/qa/assessments/3.3-test-design-20260130.md](../../docs/qa/assessments/3.3-test-design-20260130.md)
- Stories : [3.1](../../docs/stories/3.1.state-management-zustand.story.md), [3.2](../../docs/stories/3.2.vue-calendrier.story.md), [3.3](../../docs/stories/3.3.gestion-creneaux.story.md), [3.6](../../docs/stories/3.6.dette-runner-e2e-calendrier.story.md)
