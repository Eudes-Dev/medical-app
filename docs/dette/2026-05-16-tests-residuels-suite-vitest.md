# Dette — Tests résiduels suite vitest

**Date de détection :** 2026-05-16
**Détecté lors de :** revue QA voie stricte Story 3.3 (implémentation tests unit + integration)
**Statut :** À traiter
**Stories d'origine :** 2.1 (Dashboard liste patients)

## Contexte

Après réparation de la régression `useCalendarStore` (cf. polyfill `localStorage` dans [tests/setup.ts](../../tests/setup.ts)), la suite vitest passe de **19 tests cassés à 5 tests cassés** sur 139. Les 5 résiduels n'ont **aucun lien** avec les stories Epic 3 ; ils proviennent tous de la Story 2.1.

## Items

### 1. `tests/unit/hooks/use-debounce.test.tsx` — 4 tests timeout

**Symptôme :**
```
Error: Test timed out in 5000ms.
```
Sur les 4 tests : `2.1-UNIT-002`, *délai personnalisé*, *annulation timer*, *différents types de valeurs*.

**Cause racine :**
Combinaison incompatible **`vi.useFakeTimers()` + `await waitFor(...)`**. `waitFor` (de `@testing-library/react`) repose sur de vrais `setTimeout` pour son polling ; quand les timers sont mockés, il ne se réveille jamais et finit en timeout 5s.

**Piste de correction :**
- Option recommandée : **supprimer les `waitFor`**. Après `vi.advanceTimersByTime(...)` (déjà entouré d'`act()` après mon fix d'import `act`), la valeur du hook est synchronement à jour ; un `expect(result.current).toBe(...)` direct suffit.
- Alternative : `vi.useFakeTimers({ shouldAdvanceTime: true })` (mais effets de bord plus larges).

**Impact si non traité :**
4 tests rouges en CI, masquant d'éventuelles vraies régressions futures du hook `useDebounce`. Pas de risque produit immédiat (le hook est utilisé en prod et fonctionne).

**Effort estimé :** ~15 min.

---

### 2. `tests/e2e/dashboard/dashboard-stats.test.tsx` — 1 test échoue

**Symptôme :**
```
✗ 2.1-E2E-001: devrait afficher les statistiques correctement
```

**Cause racine probable :**
Test marqué E2E mais exécuté par vitest unitaire. Soit le runner unitaire n'a pas l'environnement adapté (DB seed, auth fixture), soit le test devrait être migré vers le futur runner E2E (Playwright — cf. [Story 3.6](../stories/3.6.dette-runner-e2e-calendrier.story.md)).

**Piste de correction :**
- Court terme : exclure `tests/e2e/**` du `include` vitest dans [vitest.config.ts](../../vitest.config.ts) pour éviter le faux positif.
- Long terme : migrer ce test vers le runner E2E mis en place par la Story 3.6.

**Impact si non traité :**
1 test rouge en CI, pollue le reporting. Pas de couverture E2E effective tant que 3.6 n'est pas livrée.

**Effort estimé :** ~5 min pour exclusion, ~1h pour migration Playwright (à inclure dans 3.6).

## État global au moment de la détection

| Mesure | Valeur |
|---|---|
| Tests passants | 134 / 139 |
| Tests cassés | 5 (4 use-debounce + 1 dashboard-stats E2E) |
| Fichiers FAIL | 2 |
| Régressions réparées dans la session | 14 (useCalendarStore — fix polyfill localStorage) |

## Notes

Ces deux dettes peuvent être traitées en moins d'1h cumulée et **devraient l'être avant la prochaine PR significative** pour avoir une suite verte de référence. À planifier hors d'une story produit.
