# Prompt UI — Refonte « Espace Patients » de l'admin (pour Claude Design)

> Un prompt autonome, prêt à copier-coller, pour refondre **toute la branche Patients** du dashboard admin :
> la page **liste** (`/dashboard/patients`) et **toutes les pages qui en descendent** (la fiche
> `/dashboard/patients/[id]` et ses 6 sections).
> Objectif : interface **moderne, premium, très attractive, avec de belles animations**, **sans casser
> le contrat fonctionnel** (props, types, Server Actions, validation, RGPD/sécurité) déjà couvert par les tests.

## Contexte stack commun (vérifié dans le dépôt)

- **Next.js 16** (App Router), **React 19**, TypeScript strict, composants `"use client"` côté interactif.
- **Tailwind CSS v4** (utility-first, pas de CSS modules), `cn()` de `@/lib/utils`, `tw-animate-css` dispo.
- **Animations : `motion` v12** → import depuis `motion/react` (`motion`, `AnimatePresence`, `useReducedMotion`, `LayoutGroup`, `useScroll`, `useSpring`).
- **Shadcn/Radix** : composants existants dans `@/components/ui/*` (`button`, `card`, `input`, `badge`, `avatar`, `table`, `sheet`, `dialog`, `dropdown-menu`, `select`, `tooltip`, `skeleton`, `separator`, `empty-state`, `loading-button`, `sidebar`, `breadcrumb`…). **Ne pas introduire de nouvelle lib.**
- **Tables** : `@tanstack/react-table` v8. **Icônes** : `lucide-react`. **Toasts** : `sonner` via `@/lib/ui/toast` (`showSuccess`/`showError`) + `@/lib/ui/toast-messages`.
- Palette « santé sereine » : base claire (`slate-50`/`white`), accent **bleu médical** (`blue-600` / sky / cyan), touche **teal/emerald** discrète, alerte `amber`, danger `rose`, texte `slate-700/900`. Coins `rounded-2xl/3xl`, ombres douces superposées, bordures fines `slate-200/70`, micro-dégradés subtils (jamais criards).

---

## 🟦 PROMPT — Refonte complète de l'espace Patients

```text
# Mission
Refonds toute l'expérience visuelle de l'« espace Patients » d'une application de gestion de cabinet
médical (Next.js 16, dashboard praticien). Je veux une interface MODERNE, premium, très attractive,
avec de belles animations fluides et des micro-interactions soignées — tout en restant crédible et
apaisante pour un logiciel médical professionnel (élégante, jamais gadget). La refonte couvre la page
liste ET toutes les pages/sections qui en descendent.

# Périmètre exact des fichiers à refondre
1. Page liste : `app/dashboard/patients/page.tsx`
   - `components/patients/patients-table-wrapper.tsx` (recherche + pagination + fetch)
   - `components/patients/patient-data-table.tsx` (table @tanstack/react-table)
   - `components/patients/patient-table-skeleton.tsx` (états de chargement)
   - `components/patients/create-patient-modal.tsx` + `components/patients/patient-form.tsx`
   - `app/dashboard/patients/loading.tsx` et `app/dashboard/patients/error.tsx`
2. Fiche patient (page enfant) : `app/dashboard/patients/[id]/page.tsx`
   - `components/patients/patient-detail.tsx` (en-tête profil + édition + suppression)
   - `components/patients/appointment-history.tsx` (historique des RDV)
   - `components/patients/medical-history.tsx` (antécédents structurés)
   - `components/patients/consultation-notes.tsx` (notes de consultation)
   - `components/patients/medical-documents.tsx` (pièces jointes / Supabase Storage)
   - `components/patients/consent-section.tsx` (consentements RGPD)
   - `components/patients/data-rights-section.tsx` (export / droit à l'oubli)
   - `app/dashboard/patients/[id]/loading.tsx`, `error.tsx`, `not-found.tsx`

# Stack imposée (NE PAS changer de libs, ZÉRO nouvelle dépendance)
- Next.js 16 App Router, React 19, TypeScript strict, `"use client"` sur tout composant animé/interactif.
- Tailwind CSS v4 (utility-first). `cn()` de `@/lib/utils` pour composer les classes.
- Animations : `motion` v12 → `import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react"`.
- UI existante : composants de `@/components/ui/*` (Button, Card, Input, Badge, Avatar, Table, Sheet,
  Dialog, DropdownMenu, Select, Tooltip, Skeleton, Separator, EmptyState, Breadcrumb, Sidebar…).
- Tables : `@tanstack/react-table`. Icônes : `lucide-react`. Toasts : `showSuccess`/`showError` de
  `@/lib/ui/toast` + `TOAST_MESSAGES` de `@/lib/ui/toast-messages`.

# Contrat fonctionnel à PRÉSERVER À L'IDENTIQUE (ne rien casser)
- Conserve la structure App Router : Server Components qui chargent les données (`getPatientById`,
  `getConsultationNotes`, `getMedicalDocuments`, `getMedicalHistoryEntries`, `getConsentRecords`),
  Client Components pour l'interactivité. Ne déplace aucun `await`/fetch côté client.
- Garde EXACTEMENT les mêmes signatures de props, types et Server Actions importées de
  `@/app/dashboard/patients/*` :
  - Liste : `getPatients({ search, page, pageSize })`, `createPatient`, table data `PatientTableData`.
  - Fiche : `updatePatient`, `deletePatient`, et les actions des sections (`createConsultationNote`,
    `updateConsultationNote`, `deleteConsultationNote`, upload/suppression de documents,
    `create/update/deleteMedicalHistoryEntry`, actions de consentement, export/effacement RGPD).
  - Appelle chaque action avec les mêmes arguments et gère les mêmes retours
    `{ success: true; … } | { success: false; error }`.
- Conserve toutes les règles métier existantes : validations client miroir du serveur (longueurs max,
  champs requis, formats FR), tri des listes (plus récent → ancien), `router.refresh()` après chaque
  mutation réussie, resync via `useEffect` quand les props changent, confirmations de suppression
  explicites, et la sécurité RGPD (jamais exposer `storagePath`, jamais d'URL publique de document).
- Conserve les `console.error` sur les `catch` et la même gestion d'erreurs réseau
  (`TOAST_MESSAGES.errors.server`).
- Conserve la navigation : breadcrumb Dashboard › Patients › {Nom}, bouton « Voir » → fiche,
  bouton « Nouveau Patient » (Sheet), retour à la liste après suppression.

# Direction artistique (cohérente sur liste + fiche)
Thème « santé sereine » : base claire (blanc/`slate-50`), accent principal BLEU MÉDICAL (`blue-600`/sky/cyan),
touche teal/emerald discrète pour le positif, `amber` pour l'attente, `rose` pour le danger. Coins très
arrondis (`rounded-2xl`/`rounded-3xl`), ombres douces et superposées, fines bordures `slate-200/70`,
micro-dégradés subtils, glassmorphism léger sur les en-têtes collants. Typographie nette, hiérarchie
claire (titres `tracking-tight`, labels uppercase `tracking-wide` discrets).

## A. PAGE LISTE `/dashboard/patients`
1. **En-tête de page premium** : titre « Patients » + sous-titre, et une rangée de **cartes de
   statistiques animées** (compteurs qui s'incrémentent au montage) : Total patients, Nouveaux ce
   mois, Patients actifs, RDV à venir (dérive ces chiffres des données déjà chargées ; si une donnée
   n'est pas disponible, masque proprement la carte plutôt que d'inventer un fetch).
2. **Barre d'outils** : champ de recherche avec icône `Search`, focus ring animé, debounce conservé ;
   bouton « Nouveau Patient » mis en avant (dégradé `from-sky-500 to-cyan-500`, icône `UserPlus`).
   Optionnel : bascule vue Table / vue Cartes (grille de cartes patient) avec transition `layout`.
3. **Table de données** repensée : lignes avec avatar (initiales en pastille colorée déterministe par
   nom), nom en évidence, email/téléphone secondaires, badge de statut (« Actif » avec point qui
   pulse), et un menu d'actions (`DropdownMenu` : Voir, Modifier, Supprimer). En-têtes triables avec
   indicateur de tri animé. Survol de ligne : surbrillance douce + légère élévation. Garde la
   pagination serveur existante mais redessine les contrôles (« Précédent/Suivant », indicateur de page).
4. **États** soignés : skeleton shimmer pendant le chargement (réutilise/améliore
   `patient-table-skeleton`), état vide illustré (« Aucun patient — ajoutez votre premier patient »
   avec CTA), état d'erreur élégant (`error.tsx`).
5. **Création (Sheet)** : `create-patient-modal` + `patient-form` redessinés — entrée latérale animée,
   champs avec labels flottants ou regroupés proprement, validation inline animée, bouton de soumission
   avec spinner `Loader2`.

## B. FICHE PATIENT `/dashboard/patients/[id]` (page enfant)
1. **En-tête de profil héro** : grand avatar (initiales en dégradé), nom + badge « Actif » animé,
   méta (« Membre depuis le … », téléphone, email cliquables), et actions (Modifier le profil /
   Supprimer). Bandeau de contact en cartes (email, téléphone, adresse) avec icônes en pastilles.
   En mode édition : crossfade vers `patient-form` inline (pas de saut de layout).
2. **Navigation des sections** : transforme l'empilement vertical actuel en une expérience fluide —
   soit des **onglets animés** (antécédents / notes / documents / RDV / RGPD) avec indicateur coulissant
   (`layoutId`), soit des sections en **accordéon premium** avec ancres. Garde toutes les sections
   accessibles ; ne supprime aucune fonctionnalité.
3. **Chaque section** (antécédents, notes, documents, consentements, droits RGPD, historique RDV)
   reçoit une carte premium : en-tête avec icône en pastille dégradée, compteur en badge, contenu en
   cartes internes, et un état vide illustré et engageant. Respecte le rôle de chacune :
   - Antécédents : catégorisés (allergies, traitements, chirurgical, familial) avec puces colorées par catégorie.
   - Notes de consultation : composer en « carte dans la carte », compteur de caractères vivant, édition inline.
   - Documents : zone drag & drop animée, cartes de fichiers (type, taille, catégorie), download sécurisé.
   - Consentements RGPD : toggles par finalité avec état accordé/retiré horodaté.
   - Droits RGPD : export (portabilité) + droit à l'oubli avec confirmation forte (double-confirm).
   - Historique RDV : timeline verticale avec badges de statut colorés (PENDING/CONFIRMED/CANCELLED/COMPLETED),
     panneaux dépliables (motif, modalité, lieu, note).

# Animations (cœur de la demande — `motion/react`)
- **Apparition en cascade (stagger)** : cartes de stats, lignes de table et cartes de section
  apparaissent en `initial={{opacity:0, y:12}}` → `animate={{opacity:1, y:0}}`, délais échelonnés
  (~40–60ms via index), courbe douce `ease: [0.22, 1, 0.36, 1]`.
- **AnimatePresence** partout où une liste mute (notes, documents, antécédents, lignes filtrées par la
  recherche) : insertion slide+fade+léger pop (scale 0.98→1), suppression fade + collapse de hauteur.
  L'élément nouvellement créé « surgit » en tête avec un flash d'arrière-plan `sky-50` qui s'estompe.
- **`layout` + `LayoutGroup`** : réorganisation douce des voisins quand une carte passe en édition,
  est retirée, ou quand on bascule Table/Cartes ; indicateur d'onglet coulissant via `layoutId`.
- **Compteurs animés** : les chiffres des cartes de stats s'incrémentent au montage (interpolation).
- **Micro-interactions** : boutons `whileHover={{ scale: 1.03 }}` `whileTap={{ scale: 0.96 }}` ;
  survol de ligne (surbrillance + élévation) ; focus ring animé sur les inputs ; badges/points de
  statut qui « pulsent » ; chevrons d'accordéon qui pivotent.
- **Transitions de page/section** : entrée douce de la fiche, header de page collant avec léger
  glassmorphism au scroll (`useScroll`).
- **Accessibilité animations** : si `useReducedMotion()` est vrai, désactive translations/scale et
  garde de simples fondus très courts. Aucune animation ne doit bloquer l'interaction.

# Qualité & contraintes
- **Mobile-first et responsive** : la table passe en cartes empilées sur mobile, les onglets en
  sélecteur/scroll horizontal, cibles tactiles ≥ 40px, Sheet en pleine largeur.
- **Accessibilité** : `aria-label` sur tous les boutons icônes, `aria-invalid` + `aria-live="polite"`
  sur les erreurs de validation, focus visible, navigation clavier complète (Échap ferme/annule,
  Ctrl/Cmd+Entrée soumet, flèches dans les onglets), contraste AA minimum.
- **Performance** : pas de re-render inutile, `motion` uniquement où ça compte, pas de layout thrashing,
  mémoïsation des colonnes/handlers, pas de fetch côté client ajouté.
- **Livrables** : tous les fichiers du périmètre, complets, compilables, typés strict, zéro dépendance
  nouvelle. Si tu factorises (ex. `PatientStatsCards`, `PatientRow`, `SectionTabs`, `StatusBadge`,
  `AnimatedCounter`, `EmptyState`), colocalise les sous-composants clairement nommés et garde les
  contrats publics (props exportées) inchangés.
- Ne touche pas aux Server Actions, schémas Prisma, validations Zod, ni aux tests : seule la couche
  présentation/animation change. Les 689+ tests existants doivent rester verts.

Rends tous les composants complets, prêts à coller.
```

---

## Notes d'intégration (hors prompt)

- La fiche patient est le **point d'entrée des pages descendantes** ; toutes ses sections sont déjà
  câblées dans `app/dashboard/patients/[id]/page.tsx` (Server Component qui charge les données et passe
  les props aux Client Components). Le prompt impose de **préserver ce découpage**.
- Les sections 9.x (notes, documents, antécédents) ont déjà des prompts dédiés dans
  `docs/design/epic-9-prompts-ui-claude-design.md` : ce prompt-ci les chapeaute et ajoute la **liste**,
  l'**en-tête de fiche**, l'**historique RDV** et les sections **RGPD (11.x)** pour une refonte d'ensemble cohérente.
- Vérifie après refonte : `npm run lint`, `npm run test:run`, et un passage visuel `npm run dev` sur
  `/dashboard/patients` puis sur une fiche.
