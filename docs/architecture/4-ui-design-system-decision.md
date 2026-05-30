# 4. Décision d'architecture UI — Design System (ADR)

> **Statut :** Acté (PO + Architecture) — 2026-05-30
> **Contexte :** Résolution de la contradiction documentaire entre les stories 5.1 et 7.1/7.2/7.3 (finding **C2** du rapport de validation PO 2026-05-30).

## Problème

Deux stories affirmaient des règles opposées sur la même dépendance :

- **Story 5.1** (rev 1.2) déclarait animate-ui comme *« règle projet non négociable, prioritaire »* et a **installé** le composant `Button` animate-ui (via la CLI shadcn) + la dépendance `motion`.
- **Stories 7.1 / 7.2 / 7.3** déclaraient *« animate-ui n'est pas installé … directive sans objet »* et ont tout construit en **Shadcn UI**.

Conséquence : politique UI ambiguë, et un finding QA ouvert (**UI-001** sur 5.1) sans waiver formelle.

## Décision

**Shadcn UI (primitives Radix + `components/ui/*`) est le design system officiel et unique du projet.**

1. **Tout nouveau composant UI doit être Shadcn** (ou un composant custom minimal documenté quand Shadcn ne couvre pas le besoin, ex. `EmptyState`, `LoadingButton`, `color-picker`).
2. **animate-ui n'est PAS une dépendance du projet.** La seule exception est le `Button` animate-ui installé en story 5.1 (`components/animate-ui/**`) : il est **toléré (grandfathered)** car déjà en place et fonctionnel, mais **aucun nouveau composant animate-ui ne sera ajouté**.
3. La règle de la story 5.1 *« interdiction d'importer le Button/Skeleton Shadcn »* est **annulée et remplacée** par la présente décision. Les imports `@/components/ui/button` et `@/components/ui/skeleton` sont **autorisés et recommandés** partout. Le finding **UI-001** est donc **clos par waiver** (voir gate 5.1 — à mettre à jour si réémis).
4. `Skeleton` et `Spinner` : Shadcn `Skeleton` (`animate-pulse`) + `Loader2` (lucide) sont la référence (animate-ui ne les publie pas — vérifié en 5.1).

## Conséquences

- **5.1** : les 10 fichiers `error.tsx`/`loading.tsx`/`not-found.tsx` important le `Button` Shadcn sont **conformes** à cette ADR (plus de violation DoD).
- **7.x** : conformes sans changement.
- **Dette future** : une éventuelle migration/suppression du `Button` animate-ui isolé est *nice-to-have*, non prioritaire (tracée dans le ROADMAP, section dette UI).

## Migration éventuelle (post-MVP, optionnel)

Remplacer les usages du `Button` animate-ui (`LoadingButton`) par le `Button` Shadcn + un spinner, puis supprimer `components/animate-ui/**` et la dépendance `motion` si elle n'est plus utilisée ailleurs.

[Source : docs/stories/5.1.feedback-utilisateur-ux.story.md (gate UI-001), docs/stories/7.1.configuration-horaires.story.md (constat animate-ui absent), rapport de validation PO 2026-05-30]
