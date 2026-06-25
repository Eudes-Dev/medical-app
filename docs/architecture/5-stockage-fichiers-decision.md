# 5. Décision d'architecture — Stockage de fichiers (ADR)

> **Statut :** Acté (Architecture) — validé (PO/utilisateur) 2026-06-25
> **Contexte :** Pré-requis de la story **9.2 — Documents médicaux** (épopée 9, Dossier
> patient). Aucune brique de stockage de fichiers n'existait au dépôt
> (`lib/supabase/` ne couvre que l'auth SSR ; zéro usage de Supabase Storage / bucket /
> upload). L'épopée 9 ayant besoin d'attacher des documents (ordonnances, comptes
> rendus, imagerie…) au dossier patient, il faut une stratégie de stockage **avant**
> de drafter/développer la 9.2 — la discipline BMAD interdit au Dev/SM d'inventer une
> brique d'architecture absente des docs.

## Problème

Comment stocker des **documents médicaux** (fichiers binaires) rattachés à un patient,
de façon :
1. cohérente avec la plateforme existante (Supabase + Prisma/Postgres, Server Actions) ;
2. **sécurisée** — un document médical est une **donnée de santé sensible** (RGPD) ;
3. **testable dans la boucle BMAD** (Prisma mocké, pas de base ni de storage réels) ;
4. réversible et sans dépendance nouvelle lourde.

Trois familles d'options ont été considérées :

| Option | Binaire stocké dans… | Verdict |
|---|---|---|
| **A. Supabase Storage (bucket privé)** + métadonnées en Postgres | Objet storage Supabase | **Retenue** |
| B. Binaire en base (`bytea` / base64) | Colonne Postgres | Rejetée : alourdit la base, coûteux, mauvaise pratique pour des MB de fichiers, sauvegardes gonflées. |
| C. Prestataire tiers (S3/Blob externe) | Bucket S3 / Vercel Blob | Rejetée pour le MVP étendu : nouvelle dépendance + nouveau contrat de traitement RGPD, alors que Supabase (déjà sous-traitant) couvre le besoin. |

## Décision

**Le stockage de fichiers se fait sur Supabase Storage, dans un bucket privé, avec
les métadonnées persistées en Postgres via Prisma. Le binaire n'est JAMAIS stocké en
base ni exposé via une URL publique.**

### 1. Séparation binaire / métadonnées
- Le **fichier binaire** vit dans un bucket Supabase Storage **privé** (non public).
- Un modèle Prisma **`MedicalDocument`** persiste uniquement les **métadonnées** :
  `id`, `patientId` (FK `Patient`, `onDelete: Cascade`), `storagePath` (chemin opaque
  dans le bucket), `fileName` (nom d'origine affiché), `mimeType`, `sizeBytes`,
  `category` (enum/inféré), `createdAt`, `updatedAt`. Conventions snake_case et
  migration **non destructive** identiques aux modèles existants (cf. 9.1).
- La table ne contient **aucun binaire** : `storagePath` est la seule référence.

### 2. Chemin de stockage (anti-collision / anti-traversal)
- Convention imposée : `patients/{patientId}/{uuidV4}.{ext}`.
- Le `{uuidV4}` est généré **côté serveur** ; le nom d'origine utilisateur n'est
  **jamais** utilisé comme chemin (uniquement conservé en métadonnée `fileName`).
- `patientId` et tout `id` reçus sont validés via `assertValidUuid()` avant tout appel
  (Storage ou Prisma), comme partout depuis 5.2/5.3.

### 3. Accès — bucket privé + URL signées courtes
- **Aucune URL publique.** Le bucket est privé.
- Lecture/téléchargement : une **Server Action protégée par `requireUser()`** génère
  une **URL signée à TTL court** (≤ 60 s recommandé) via le client Storage côté serveur.
- Upload : privilégier une **URL d'upload signée** générée côté serveur
  (`createSignedUploadUrl`) après validation des métadonnées, **ou** un proxy via Server
  Action si le volume est faible. Le choix d'implémentation est laissé à la story 9.2,
  mais **toute** opération passe par `requireUser()` au préalable.

### 4. Validation (Zod isomorphe)
- `mimeType` : **allowlist** stricte (a minima `application/pdf`, `image/jpeg`,
  `image/png`). Refuser tout type hors liste côté client **et** serveur.
- `sizeBytes` : plafond explicite (recommandé **10 Mo**), validé serveur.
- `fileName` : trimé, non vide, longueur bornée ; **jamais** réutilisé comme chemin.
- Schéma isomorphe `medicalDocumentSchema` dans `lib/validations/` (même pattern que
  `consultationNoteSchema` de 9.1).

### 5. Cohérence suppression
- Supprimer un `MedicalDocument` doit supprimer **l'objet Storage ET la ligne** (best
  effort transactionnel : supprimer l'objet, puis la ligne ; logguer l'orphelin si
  l'un échoue).
- Supprimer un `Patient` purge ses documents (FK `onDelete: Cascade` côté ligne).
  ⚠️ La **purge des objets Storage** correspondants n'est pas garantie par la cascade
  SQL : prévoir un nettoyage applicatif lors de la suppression patient, ou tracer la
  dette d'objets orphelins (à arbitrer en 9.2).

## Conséquences

- **Nouveau découplage** : introduire un module d'abstraction `lib/storage/` (interface
  fine : `uploadDocument`, `getSignedDownloadUrl`, `deleteDocument`) encapsulant le
  client Supabase Storage. Bénéfice : **mockable en test** exactement comme
  `@/lib/prisma` et `@/lib/supabase/server` le sont déjà (la boucle BMAD reste verte
  sans storage réel).
- **Étape ops hors boucle** (analogue à `prisma migrate deploy`) : création du **bucket
  privé** et configuration des **politiques RLS/Storage** côté Supabase. À documenter
  dans la story 9.2 comme livrable ops **non exécuté par la boucle** (garde-fou :
  aucune action déploiement/infra distante automatisée).
- **Variable d'environnement** : un nom de bucket configurable (ex.
  `SUPABASE_MEDICAL_DOCS_BUCKET`) plutôt qu'une valeur codée en dur.

## Cadrage RGPD / Sécurité (important)

Les documents médicaux sont des **données de santé** (catégorie particulière, art. 9
RGPD). Cette ADR pose le **socle minimal** sécurisé (bucket privé, URL signées courtes,
`requireUser()`, allowlist MIME, pas d'URL publique). Elle **ne couvre pas** :

- **Chiffrement applicatif** des documents (épopée **11.4**, non livrée) — le
  chiffrement au repos repose pour l'instant sur celui du fournisseur Supabase/Postgres.
- **Journal d'audit** des accès aux documents (épopée **11.3**, non livrée).
- **Consentement / droit à l'oubli / export** (épopées **11.1 / 11.2**, non livrées).

➡️ **Contrainte produit :** exposer en **production** la fonctionnalité de documents
médicaux **avant** un arbitrage explicite sur l'épopée 11 (RGPD) est un **risque de
conformité**. La story 9.2 peut être **développée et testée** (dev/preview) sur ce
socle, mais sa **mise en production** doit être conditionnée à une décision PO/RGPD.
Cette réserve doit figurer dans la story 9.2 et le ROADMAP.

[Source : prisma/schema.prisma (modèles existants + ConsultationNote 9.1),
docs/stories/9.1.notes-de-consultation.story.md (pattern Server Actions + tests mockés),
docs/stories/ROADMAP.md (épopée 11 RGPD post-MVP), lib/supabase/server.ts]
