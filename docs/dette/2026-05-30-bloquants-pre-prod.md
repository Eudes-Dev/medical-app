# 2026-05-30 — Bloquants pré-production (consolidés)

**Origine :** Rapport de validation PO Master Checklist du 2026-05-30.
**Propriétaire :** [Story 5.3 — Consolidation pré-production](../stories/5.3.consolidation-pre-prod.story.md).
**Statut :** ouvert — **BLOQUANT** pour l'exposition publique du tunnel.

> Ces points étaient auparavant « tracés » vers des stories **supprimées** du dépôt (13.5 rate-limiting,
> 8.1 annulation). Ils n'avaient donc plus de propriétaire. Ils sont regroupés ici et possédés par la
> story 5.3.

## REL-001 — Génération de créneaux en fuseau serveur
- **Symptôme :** `setHours()` dans `lib/cabinet/slots.ts` utilise la TZ locale du process. Sur Vercel (UTC), un créneau « 10:00 » devient 10:00 UTC = 12:00 Paris (été) / 11:00 (hiver).
- **Impact :** tous les RDV du tunnel public potentiellement décalés de 1-2 h.
- **Cause racine :** absence d'usage de `CABINET_TIMEZONE` (présent mais inutilisé) à la génération.
- **Correction :** `date-fns-tz` (`fromZonedTime`) — story 5.3 AC 1-3.
- **Carry-over :** gates 4.1, 4.2, 7.1, 7.2.

## SEC-001 — Pas de rate-limiting sur les actions publiques
- **Symptôme :** `getAvailableSlots` et `createGuestBooking` non authentifiées, sans limite ; `createGuestBooking` crée des lignes en base.
- **Impact :** scraping, DoS applicatif, spam de patients/RDV.
- **Correction :** limiteur par IP — story 5.3 AC 4-6 (rend caduque la story 13.5 descopée).

## CANCEL-ROUTE-001 — Lien d'annulation 404
- **Symptôme :** la route `app/(public)/[cabinet-slug]/book/cancel` **n'existe pas** (vérifié 2026-05-30), or les emails (6.1) et SMS (6.3) envoient `…/book/cancel?token=…`.
- **Impact :** chaque patient cliquant sur « Annuler » obtient une 404.
- **Correction :** créer la route + `cancelByToken` — story 5.3 AC 7-9.

## OPS-001 — Migrations non appliquées / flux fragile
- **Symptôme :** migration `working_hours` non appliquée en prod (Dev Notes 7.1) ; plusieurs migrations posées via `db push` + `migrate resolve --applied` (6.x, 7.1).
- **Impact :** tunnel sans créneaux après déploiement ; risque de divergence schéma↔migrations.
- **Correction :** [procédure de migration prod](./2026-05-30-procedure-migration-prod.md) + vérif `migrate status` — story 5.3 AC 10-11.

## TEST-BASELINE-001 — Baseline de tests rouge tolérée
- **Symptôme :** 5-7 tests « pré-existants » rouges répétés dans chaque story ; dont **régression réelle** `3.3-INT-008/009` (cassée par `include: { patient }` ajouté en 6.x).
- **Impact :** masque les futures régressions (fenêtre brisée).
- **Correction :** réparer/quarantainer — story 5.3 AC 12-13. Voir aussi [tests résiduels](./2026-05-16-tests-residuels-suite-vitest.md).
