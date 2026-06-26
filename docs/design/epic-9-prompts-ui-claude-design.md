# Prompts UI — Épopée 9 « Dossier patient » (pour Claude Design)

> Trois prompts autonomes, un par interface, prêts à copier-coller dans Claude Design.
> Objectif : refonte visuelle MODERNE + animations fluides, **sans casser le contrat fonctionnel**
> (props, types, Server Actions, validation, RGPD/sécurité) déjà couvert par les tests (689 verts).

## Contexte stack commun (vérifié dans le dépôt)

- **Next.js 16** (App Router), **React 19**, TypeScript strict, composants `"use client"`.
- **Tailwind CSS v4** (utility-first), `cn()` de `@/lib/utils`, `tw-animate-css` dispo.
- **Animations : `motion` v12** → import depuis `motion/react` (`motion`, `AnimatePresence`, `useReducedMotion`, `LayoutGroup`).
- **Shadcn/Radix** : `@/components/ui/{button,card,textarea,select}`.
- **Icônes** : `lucide-react`. **Toasts** : `sonner` via `@/lib/ui/toast` (`showSuccess`/`showError`) + `@/lib/ui/toast-messages`.
- Palette commune : base claire (`slate-50`/`white`), accent **bleu médical** (sky/cyan) + touche **teal/emerald**, danger `rose`, coins `rounded-2xl/3xl`, ombres douces, bordures fines `slate-200/70`.

Les trois interfaces sont des **sections de la fiche patient** `app/dashboard/patients/[id]/page.tsx`.

---

## 🟦 PROMPT 1 — Section « Notes de consultation »

```text
# Mission
Refonds l'UI du composant React `components/patients/consultation-notes.tsx` d'une application médicale Next.js. Je veux une interface MODERNE, premium, avec des animations fluides et des micro-interactions soignées qui donnent envie au praticien de rester sur la fiche patient. L'esthétique doit rester crédible pour un logiciel médical professionnel : élégante, apaisante, jamais gadget.

# Stack imposée (NE PAS changer de libs)
- Next.js 16 (App Router), React 19, TypeScript strict, `"use client"`.
- Tailwind CSS v4 (utility-first, pas de CSS modules).
- Animations : `motion` v12 → importer depuis `motion/react` (`motion`, `AnimatePresence`, `useReducedMotion`, `LayoutGroup`).
- Composants UI existants : `@/components/ui/button` (Button), `@/components/ui/card` (Card, CardContent, CardHeader, CardTitle), `@/components/ui/textarea` (Textarea).
- Icônes : `lucide-react` (ex. `NotebookPen`, `CalendarClock`, `Pencil`, `Trash2`, `Plus`, `Check`, `X`, `Loader2`).
- Toasts : `sonner` via `showSuccess`/`showError` de `@/lib/ui/toast` + `TOAST_MESSAGES` de `@/lib/ui/toast-messages`.
- `cn()` depuis `@/lib/utils` pour composer les classes.

# Contrat fonctionnel à PRÉSERVER À L'IDENTIQUE (ne rien casser)
Props :
```ts
export type ConsultationNotesProps = {
  patientId: string;
  notes: ConsultationNoteData[];
};
```
Type de données :
```ts
type ConsultationNoteData = {
  id: string;
  content: string;
  appointmentId: string | null; // si présent → afficher un badge "Rendez-vous rattaché"
  createdAt: Date;
};
```
Server Actions (importées de `@/app/dashboard/patients/consultation-note-actions`), à appeler exactement comme aujourd'hui :
- `createConsultationNote(patientId, { content }) => { success: true; note } | { success: false; error }`
- `updateConsultationNote(noteId, { content }) => même forme`
- `deleteConsultationNote(noteId) => { success: true } | { success: false; error }`

Règles métier inchangées :
- Validation client miroir du serveur : contenu trimé non vide, ≤ `CONSULTATION_NOTE_MAX_LENGTH` (importer la constante de `@/lib/validations/consultation-notes`, = 5000). Refus affiché inline avant tout appel réseau.
- Liste triée du plus RÉCENT au plus ancien. Date affichée au format FR `toLocaleString("fr-FR", { year/month/day/hour/minute "2-digit"/"numeric" })`.
- État local optimiste (insertion immédiate en tête, retrait immédiat à la suppression), puis `router.refresh()` (`next/navigation`) après chaque mutation réussie. Resync via `useEffect` quand la prop `notes` change.
- Édition INLINE (la carte se transforme en éditeur, sans modale).
- Suppression confirmée. Tu peux remplacer le `window.confirm` par une confirmation inline animée (mini-popover "Confirmer / Annuler" qui se déplie dans la carte) — plus moderne — mais la suppression ne doit jamais partir sans confirmation explicite.
- Toasts : `TOAST_MESSAGES.consultationNote.created / .updated / .deleted` ; erreurs réseau → `TOAST_MESSAGES.errors.server`.

# Direction artistique
Thème "santé sereine" : base claire (blanc cassé `slate-50`/`white`), accent principal **bleu médical** (sky/cyan) avec une touche **teal/emerald** discrète, texte `slate-700/900`, danger en `rose`. Coins très arrondis (`rounded-2xl`/`rounded-3xl`), ombres douces et superposées, fines bordures `slate-200/70`, micro-dégradés subtils (jamais criards).

Compose la section ainsi :
1. **En-tête de carte premium** : icône `NotebookPen` dans une pastille en dégradé `from-sky-500 to-cyan-500` (texte blanc), titre "Notes de consultation", et un **compteur de notes** dans un badge discret. Léger effet de brillance/halo au survol de l'en-tête.
2. **Composer (formulaire d'ajout)** mis en avant comme un bloc "carte dans la carte" : Textarea auto-resize avec focus ring animé (anneau qui s'illumine en `sky`), **compteur de caractères vivant** (ex. `124 / 5000`) qui passe en `amber` puis `rose` à l'approche de la limite, et un bouton "Ajouter la note" avec icône `Plus`. Pendant l'envoi : spinner `Loader2` qui tourne + label "Enregistrement…", bouton désactivé.
3. **Liste de notes** : chaque note = carte avec barre d'accent latérale colorée, date en label discret (uppercase, tracking), badge "Rendez-vous rattaché" (icône `CalendarClock`) si `appointmentId`, et actions (modifier/supprimer) qui apparaissent en fondu au survol de la carte (toujours focusables au clavier).
4. **État vide** soigné et illustré (icône en filigrane + phrase engageante "Aucune note pour l'instant — commencez l'historique clinique de ce patient.").

# Animations (cœur de la demande — utiliser `motion/react`)
- **Apparition initiale en cascade (stagger)** des cartes de notes : `initial={{opacity:0, y:12}}`, `animate={{opacity:1, y:0}}`, délais échelonnés (~40-60ms) via `transition` + index, courbe douce (`ease: [0.22, 1, 0.36, 1]`).
- **AnimatePresence** sur la liste : insertion (slide+fade depuis le haut, léger "pop" scale 0.98→1) et suppression (fade + collapse de hauteur + léger slide). La note nouvellement ajoutée doit "surgir" en tête avec un highlight temporaire (flash d'arrière-plan `sky-50` qui s'estompe).
- **`layout` animations** : quand une carte passe en mode édition (sa hauteur change) ou quand une note est retirée, les voisines se réorganisent en douceur (`layout` prop + `LayoutGroup`).
- **Micro-interactions** : boutons `whileHover={{ scale: 1.03 }}` `whileTap={{ scale: 0.96 }}` ; icônes d'action avec transition de couleur/fond ; focus ring animé sur la Textarea ; le badge compteur qui "pulse" brièvement quand une note est ajoutée.
- **Confirmation de suppression** : expansion/collapse animé (height auto) du mini-bloc "Confirmer la suppression ?".
- **Transition de mode édition** : crossfade entre l'affichage (texte) et l'éditeur (Textarea + boutons Enregistrer/Annuler), sans saut de layout.
- **Respect de l'accessibilité** : si `useReducedMotion()` est vrai, désactive translations/scale et garde de simples fondus très courts.

# Qualité & contraintes
- Mobile-first et responsive (le composer passe en pleine largeur, actions tactiles ≥ 40px).
- Accessibilité : `aria-label` sur tous les boutons icônes, `aria-invalid` sur la Textarea en erreur, `aria-live="polite"` pour les messages d'erreur de validation, focus visible, navigation clavier complète (Échap annule l'édition, Ctrl/Cmd+Entrée soumet).
- Performance : pas de re-render inutile ; `motion` uniquement où ça compte ; pas de layout thrashing.
- Garde des `console.error` sur les catch (comme l'existant) et la même gestion d'erreurs.
- Livrable : le fichier `consultation-notes.tsx` complet, compilable, typé strict, zéro dépendance nouvelle. Si tu factorises (ex. `NoteCard`, `NoteComposer`, `EmptyState`), garde tout dans le même fichier ou propose des sous-composants colocalisés clairement nommés.

Rends le composant complet, prêt à coller.
```

---

## 🟩 PROMPT 2 — Section « Documents médicaux »

```text
# Mission
Refonds l'UI du composant React `components/patients/medical-documents.tsx` (application médicale Next.js). Objectif : une interface de gestion de pièces jointes MODERNE et premium — zone de dépôt drag & drop animée, cartes de documents élégantes, transitions fluides — qui rend la consultation du dossier agréable et "addictive", tout en restant professionnelle pour un usage médical.

# Stack imposée (NE PAS changer de libs)
- Next.js 16 App Router, React 19, TypeScript strict, `"use client"`.
- Tailwind CSS v4. Animations via `motion` v12 (`import { motion, AnimatePresence, useReducedMotion } from "motion/react"`).
- UI existante : `@/components/ui/button`, `@/components/ui/card` (Card/CardContent/CardHeader/CardTitle), `@/components/ui/select` (Select, SelectContent, SelectItem, SelectTrigger, SelectValue).
- Icônes lucide-react : `Paperclip`, `FileText`, `Image`, `FileType2`, `Download`, `Trash2`, `UploadCloud`, `Loader2`, `CheckCircle2`, `AlertCircle`.
- Supabase client navigateur : `createClient` de `@/lib/supabase/client`.
- Toasts : `showSuccess`/`showError` de `@/lib/ui/toast` + `TOAST_MESSAGES` de `@/lib/ui/toast-messages`.
- `cn()` de `@/lib/utils`.

# Contrat fonctionnel à PRÉSERVER À L'IDENTIQUE
Props :
```ts
export type MedicalDocumentsProps = {
  patientId: string;
  documents: MedicalDocumentData[];
};
```
Type de données (jamais d'exposition de `storagePath`) :
```ts
type MedicalDocumentData = {
  id: string;
  fileName: string;
  mimeType: string;          // "application/pdf" | "image/jpeg" | "image/png"
  sizeBytes: number;
  category: MedicalDocumentCategoryValue; // enum
  createdAt: Date;
};
```
Constantes/validation (importer de `@/lib/validations/medical-documents`) :
- `MEDICAL_DOCUMENT_ALLOWED_MIME` = { "application/pdf":"pdf", "image/jpeg":"jpg", "image/png":"png" }
- `MEDICAL_DOCUMENT_MAX_SIZE_BYTES` = 10 Mo
- `MEDICAL_DOCUMENT_CATEGORIES` = ["PRESCRIPTION","REPORT","IMAGING","ANALYSIS","OTHER"]
- `MEDICAL_DOCUMENT_CATEGORY_LABELS` = { PRESCRIPTION:"Ordonnance", REPORT:"Compte rendu", IMAGING:"Imagerie", ANALYSIS:"Analyses", OTHER:"Autre" }
- types `MedicalDocumentCategoryValue`, `MedicalDocumentMime`

Server Actions (de `@/app/dashboard/patients/medical-document-actions`), flux d'upload en 2 temps à conserver EXACTEMENT :
- `createMedicalDocument(patientId, { fileName, mimeType, sizeBytes, category })` → `{ success, document, upload: { bucket, path, token, signedUrl } } | { success:false, error }`
- puis upload binaire client : `createClient().storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file)`
- si l'upload échoue → rollback `deleteMedicalDocument(document.id)` + toast `TOAST_MESSAGES.medicalDocument.uploadFailed`
- `getMedicalDocumentDownloadUrl(documentId)` → `{ success, url }` puis `window.open(url, "_blank", "noopener,noreferrer")`
- `deleteMedicalDocument(documentId)` → `{ success:true } | { success:false, error }`

Règles inchangées :
- Validation client miroir serveur : MIME ∈ allowlist, taille > 0 et ≤ 10 Mo. Refus inline AVANT appel réseau.
- Liste du plus récent au plus ancien. Taille lisible (o / Ko / Mo). Date FR `toLocaleString("fr-FR", …)`.
- État local optimiste + `router.refresh()` (`next/navigation`) après succès ; resync `useEffect` sur la prop `documents`.
- Toasts : `medicalDocument.added / .deleted / .uploadFailed` ; erreurs → `TOAST_MESSAGES.errors.server`.
- Garder `accept` sur l'input fichier = liste des MIME autorisés ; conserver un `fileInputRef` pour reset.

# Direction artistique
Même langage visuel que le reste du dossier patient : clair, bleu médical (sky/cyan) + accent teal, coins `rounded-2xl/3xl`, ombres douces, bordures fines. Pictogrammes de type de fichier colorés par MIME (PDF = rouge/rose doux, JPEG/PNG = violet/indigo doux) pour un repérage instantané. Catégories sous forme de **chips/pills** colorées et cohérentes (une teinte par catégorie).

Compose :
1. **En-tête premium** : pastille dégradée `from-sky-500 to-cyan-500` avec icône `Paperclip`, titre "Documents médicaux", compteur de documents en badge.
2. **Zone de dépôt (Dropzone) animée** : grande zone en pointillés `rounded-3xl` avec icône `UploadCloud`, texte "Glissez un fichier ici ou cliquez pour parcourir", mention des formats acceptés (PDF, JPEG, PNG · max 10 Mo). Gère le **drag & drop réel** (onDragOver/onDragLeave/onDrop) en plus du clic : au survol d'un fichier, la zone s'illumine (bordure et fond `sky`, légère mise à l'échelle, icône qui rebondit doucement). Sous la dropzone : un **Select de catégorie** et un aperçu du fichier sélectionné (nom + taille + type) avec un bouton "Téléverser". Pendant l'upload : barre/indicateur de progression animé + spinner `Loader2`, état désactivé ; à la réussite, un `CheckCircle2` qui "pop".
3. **Grille/liste de documents** : cartes avec icône de type de fichier dans une vignette colorée, `fileName` (tronqué proprement), chip de catégorie, taille, date, et actions **Télécharger** (`Download`) + **Supprimer** (`Trash2`). Survol = élévation (ombre + translation `-translate-y-0.5`) et révélation douce des actions.
4. **État vide** illustré et engageant ("Aucun document — déposez ordonnances, comptes rendus ou imagerie ici.").

# Animations (cœur de la demande — `motion/react`)
- **Stagger d'apparition** des cartes documents (fade + `y`), courbe `[0.22,1,0.36,1]`.
- **AnimatePresence** : ajout (slide/scale "pop" en tête + highlight `sky-50` qui s'estompe), suppression (fade + collapse). `layout` pour la réorganisation fluide des voisines.
- **Dropzone réactive** : transition d'état drag-active (bordure, fond, scale, icône animée en boucle douce pendant le survol d'un fichier).
- **Feedback d'upload** : indicateur de progression animé (au minimum une barre indéterminée fluide), transition succès → `CheckCircle2` animé, échec → `AlertCircle` + shake léger.
- **Micro-interactions** : boutons `whileHover`/`whileTap`, vignettes d'icône avec léger tilt au survol, chips de catégorie avec transition de couleur.
- **Confirmation de suppression** inline animée (expand/collapse) plutôt que `window.confirm` (mais confirmation obligatoire avant suppression).
- **`useReducedMotion`** : fallback en fondus courts, sans translations/scale, si l'utilisateur le préfère.

# Qualité & contraintes
- Responsive (grille 1 col mobile → 2 cols ≥ md si pertinent), cibles tactiles ≥ 40px.
- A11y : `aria-label` sur boutons icônes et dropzone, input fichier accessible au clavier, `aria-live` pour erreurs/upload, focus visible, Select accessible (déjà Radix).
- Sécurité/robustesse : ne jamais afficher d'URL de stockage ; garder le rollback en cas d'échec d'upload ; conserver les `console.error` des catch.
- Performance : animations GPU-friendly (transform/opacity), pas de reflow coûteux.
- Livrable : `medical-documents.tsx` complet, typé strict, compilable, zéro nouvelle dépendance. Sous-composants colocalisés autorisés (`Dropzone`, `DocumentCard`, `EmptyState`).

Rends le composant complet, prêt à coller.
```

---

## 🟪 PROMPT 3 — Section « Antécédents médicaux »

```text
# Mission
Refonds l'UI du composant React `components/patients/medical-history.tsx` (application médicale Next.js). C'est une vue clinique de fond, structurée et regroupée par catégorie. Je veux une interface MODERNE et premium, lisible d'un coup d'œil, avec des animations fluides et des transitions de groupe élégantes, qui donne envie au praticien d'enrichir et de relire le dossier. Esthétique médicale pro : claire, rassurante, structurée.

# Stack imposée (NE PAS changer de libs)
- Next.js 16 App Router, React 19, TypeScript strict, `"use client"`.
- Tailwind CSS v4. Animations via `motion` v12 (`import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react"`).
- UI existante : `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/textarea`, `@/components/ui/select`.
- Icônes lucide-react : `HeartPulse`, `Pencil`, `Trash2`, `Plus`, `Loader2`, `ShieldAlert` (Allergies), `Pill` (Traitements), `Scissors`/`Stethoscope` (Chirurgicaux), `Users` (Familiaux), `MoreHorizontal` (Autres).
- Toasts : `showSuccess`/`showError` (`@/lib/ui/toast`) + `TOAST_MESSAGES` (`@/lib/ui/toast-messages`). `cn()` de `@/lib/utils`.

# Contrat fonctionnel à PRÉSERVER À L'IDENTIQUE
Props :
```ts
export type MedicalHistoryProps = {
  patientId: string;
  entries: MedicalHistoryEntryData[];
};
```
Type :
```ts
type MedicalHistoryEntryData = {
  id: string;
  content: string;
  category: MedicalHistoryCategory; // enum
  createdAt: Date;
};
```
Constantes/validation (importer de `@/lib/validations/medical-history`) :
- `MEDICAL_HISTORY_CATEGORIES` = ["ALLERGY","CURRENT_TREATMENT","SURGICAL_HISTORY","FAMILY_HISTORY","OTHER"] (ordre d'affichage)
- `MEDICAL_HISTORY_CATEGORY_LABELS` = { ALLERGY:"Allergies", CURRENT_TREATMENT:"Traitements en cours", SURGICAL_HISTORY:"Antécédents chirurgicaux", FAMILY_HISTORY:"Antécédents familiaux", OTHER:"Autres" }
- `MEDICAL_HISTORY_CONTENT_MAX_LENGTH` = 2000
- type `MedicalHistoryCategory`

Server Actions (de `@/app/dashboard/patients/medical-history-actions`), appel identique :
- `createMedicalHistoryEntry(patientId, { content, category }) => { success, entry } | { success:false, error }`
- `updateMedicalHistoryEntry(entryId, { content, category }) => même forme` (l'édition modifie contenu ET catégorie)
- `deleteMedicalHistoryEntry(entryId) => { success:true } | { success:false, error }`

Règles inchangées :
- Validation client miroir serveur : contenu trimé non vide, ≤ 2000 ; catégorie ∈ enum. Refus inline avant appel.
- Affichage **regroupé par catégorie** dans l'ordre de `MEDICAL_HISTORY_CATEGORIES` ; un groupe vide n'est PAS rendu ; dans chaque groupe, tri du plus récent au plus ancien. Date FR `toLocaleString("fr-FR", …)`.
- L'édition d'une catégorie doit faire **migrer visuellement** l'entrée vers son nouveau groupe (animation de transition de groupe).
- État local optimiste + `router.refresh()` après succès ; resync `useEffect` sur la prop `entries`.
- Toasts : `medicalHistory.created / .updated / .deleted` ; erreurs → `TOAST_MESSAGES.errors.server`.

# Direction artistique
Langage visuel commun au dossier patient : clair, bleu médical (sky/cyan) + accent teal, `rounded-2xl/3xl`, ombres douces, bordures fines. **Chaque catégorie a sa propre identité couleur + icône** pour un repérage instantané, par ex. :
- Allergies → rose/rouge doux + `ShieldAlert`
- Traitements en cours → emerald/teal + `Pill`
- Antécédents chirurgicaux → indigo/violet + `Stethoscope`
- Antécédents familiaux → amber doux + `Users`
- Autres → slate + `MoreHorizontal`
Les en-têtes de groupe sont des bandeaux discrets (icône en pastille teintée + libellé + compteur d'entrées du groupe).

Compose :
1. **En-tête premium** : pastille dégradée `from-sky-500 to-cyan-500` + `HeartPulse`, titre "Antécédents médicaux", total d'entrées en badge.
2. **Composer (formulaire d'ajout)** en bloc "carte dans la carte" : Select de catégorie (avec icône+couleur de la catégorie dans le trigger), Textarea auto-resize avec focus ring animé + compteur de caractères vivant (amber→rose près de la limite), bouton "Ajouter un antécédent" (`Plus`, spinner pendant l'envoi).
3. **Groupes par catégorie** : chaque groupe = section avec bandeau coloré + liste de cartes (barre d'accent latérale à la couleur de la catégorie, date discrète, contenu, actions modifier/supprimer révélées au survol). Édition inline (Select catégorie + Textarea + Enregistrer/Annuler).
4. **État vide global** illustré et engageant ("Aucun antécédent renseigné — ajoutez allergies, traitements et antécédents pour une vue clinique complète.").

# Animations (cœur de la demande — `motion/react`)
- **Entrée en cascade** des groupes puis des cartes (stagger imbriqué), fade + `y`, courbe `[0.22,1,0.36,1]`.
- **AnimatePresence + LayoutGroup** : ajout (pop en tête de groupe + highlight qui s'estompe), suppression (fade + collapse), et surtout **migration d'entrée entre groupes** lors d'un changement de catégorie → animation `layout` fluide (l'item quitte un groupe et rejoint l'autre sans saut). Un groupe qui devient vide disparaît en douceur ; un groupe qui apparaît se déplie.
- **Transition de mode édition** : crossfade affichage ↔ éditeur sans saut de layout (`layout`).
- **Confirmation de suppression** inline animée (expand/collapse) au lieu de `window.confirm` (confirmation obligatoire).
- **Micro-interactions** : boutons `whileHover`/`whileTap`, pastilles d'icône avec léger tilt, compteur du groupe qui pulse à l'ajout, focus ring animé.
- **`useReducedMotion`** : fallback fondus courts sans translations/scale.

# Qualité & contraintes
- Responsive, cibles tactiles ≥ 40px, lisibilité prioritaire (c'est une vue de lecture clinique).
- A11y : `aria-label` sur boutons icônes et Selects, `aria-invalid`/`aria-live` pour erreurs, navigation clavier (Échap annule l'édition, Ctrl/Cmd+Entrée soumet), focus visible, contraste suffisant des couleurs de catégorie.
- Conserver les `console.error` des catch et la même gestion d'erreurs.
- Performance : transform/opacity uniquement, pas de reflow lourd, stagger raisonnable même avec beaucoup d'entrées.
- Livrable : `medical-history.tsx` complet, typé strict, compilable, zéro nouvelle dépendance. Sous-composants colocalisés autorisés (`HistoryComposer`, `CategoryGroup`, `EntryCard`, `EmptyState`). Centralise la table couleur/icône par catégorie dans une constante locale.

Rends le composant complet, prêt à coller.
```

---

## Notes d'usage

- Les trois prompts **préservent le contrat fonctionnel** (props, types, Server Actions, validation, RGPD/sécurité) — Claude Design ne refait que le visuel + les animations, sans casser la logique testée (689 tests verts).
- Cohérence garantie : même palette (bleu médical + teal), `motion/react`, `rounded-2xl/3xl`, ombres douces, `useReducedMotion` pour l'accessibilité.
- Amélioration commune proposée : remplacer `window.confirm` par une **confirmation inline animée** (la confirmation reste obligatoire).
- Point d'intégration commun : `app/dashboard/patients/[id]/page.tsx` monte les trois sections dans l'ordre **Antécédents → Notes → Documents**.
