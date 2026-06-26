# 6. Décision d'architecture — Chiffrement applicatif des données cliniques au repos (ADR)

> **Statut :** Acté (Architecture) — 2026-06-26
> **Contexte :** Pré-requis de la story **11.4 — Chiffrement** (dernière brique de
> l'épopée 11 « RGPD / Sécurité »). L'ADR §5 (stockage de fichiers) avait
> explicitement reporté le **chiffrement applicatif** à l'épopée 11.4
> (« le chiffrement au repos repose pour l'instant sur celui du fournisseur
> Supabase/Postgres »). Les stories 9.x (notes 9.1, antécédents 9.3) persistent
> des **données de santé en clair** dans des colonnes texte ; leur mise en
> production a été conditionnée à un arbitrage RGPD couvrant l'épopée 11.

## Problème

Comment ajouter une **couche de chiffrement applicatif au repos** sur les champs
texte cliniques les plus sensibles (données de santé, art. 9 RGPD) de façon :

1. cohérente avec la plateforme (Prisma/Postgres, Server Actions, Next.js) ;
2. **défense en profondeur** — au-delà du chiffrement disque du fournisseur
   (Supabase/Postgres), pour qu'un accès en lecture seule à la base (dump, fuite
   de sauvegarde, accès SQL direct) n'expose pas le contenu clinique en clair ;
3. **testable dans la boucle BMAD** (Prisma mocké, pas de base réelle) ;
4. **réversible, non destructif et rétro-compatible** (pas de migration de schéma,
   les lignes en clair existantes restent lisibles).

## Décision

**Chiffrement applicatif de champ (field-level), au format enveloppe authentifiée
AES-256-GCM, appliqué à la frontière de la couche d'accès aux données (Server
Actions), sur les champs texte cliniques libres de l'épopée 9. Aucun changement
de schéma : le texte chiffré est stocké dans la colonne `String` existante.**

### 1. Périmètre des champs chiffrés (cette story)

| Champ | Modèle | Origine | Chiffré 11.4 |
|---|---|---|---|
| `content` | `ConsultationNote` | 9.1 | **Oui** |
| `content` | `MedicalHistoryEntry` | 9.3 | **Oui** |

Ce sont les deux **fonds cliniques structurés libres** explicitement placés sous
réserve RGPD de production. Hors périmètre (résiduels documentés, cf. §6) :
`Patient.notes`, `Appointment.notes/motif/modalite/lieu`, et le **binaire** des
`MedicalDocument` (chiffrement de fichier — plus lourd, repose sur le chiffrement
au repos Supabase Storage).

### 2. Format d'enveloppe (versionné, auto-descriptif)

```
enc:v1:<base64url(iv)>:<base64url(authTag)>:<base64url(ciphertext)>
```

- Algorithme : **AES-256-GCM** (chiffrement authentifié — confidentialité +
  intégrité). IV aléatoire **12 octets** par valeur (jamais réutilisé). Tag
  d'authentification **16 octets**.
- Le préfixe `enc:v1:` rend la valeur **auto-descriptive** : on détecte
  trivialement une valeur chiffrée d'une valeur en clair, et la version `v1`
  autorise une rotation d'algorithme/clé future sans ambiguïté.

### 3. Rétro-compatibilité (lecture tolérante, écriture chiffrante)

- **Lecture (`decryptField`)** : si la valeur commence par `enc:v1:` → déchiffrer ;
  **sinon, renvoyer la valeur telle quelle** (legacy en clair). Cela garantit
  qu'aucune ligne existante ne devient illisible et **rend l'adoption progressive**
  (les lignes se chiffrent à la prochaine écriture, ou via un backfill ops).
- **Écriture (`encryptField`)** : chiffre toujours (si le chiffrement est activé).
- Conséquence : **aucune migration de schéma ni de données n'est requise** pour
  activer la fonctionnalité. Un backfill des lignes existantes est une **étape ops
  optionnelle** (hors boucle, comme `prisma migrate deploy`).

### 4. Gestion de la clé

- Clé maîtresse fournie via la variable d'environnement **`DATA_ENCRYPTION_KEY`**
  (32 octets encodés en base64 — `openssl rand -base64 32`). Jamais codée en dur,
  jamais commitée.
- **Comportement sans clé (dégradation documentée)** : si `DATA_ENCRYPTION_KEY`
  est absente/vide, le chiffrement est **désactivé** — `encryptField` renvoie le
  clair et `decryptField` agit en passe-plat. Cela permet au dev/preview et à la
  **boucle de test** de fonctionner sans secret. **En production, la clé est
  obligatoire** (étape ops, au même titre que les migrations et le bucket Storage).
- **Déchiffrement impossible** (valeur `enc:v1:` mais clé absente ou erronée, ou
  données altérées → échec du tag GCM) : `decryptField` **lève**. Les couches
  d'accès traitent cet échec comme une erreur de lecture (jamais renvoyer un
  contenu corrompu silencieusement).
- Une **rotation de clé** (changement de `v1` → `v2`, ré-enveloppe) est un
  durcissement futur hors périmètre ; le format versionné la rend possible.

### 5. Emplacement & frontière d'application

- Module d'infrastructure **`lib/security/crypto.ts`** : `encryptField`,
  `decryptField`, `isEncrypted`, `isEncryptionEnabled` (encapsule `node:crypto`).
  Mockable / testable exactement comme `@/lib/storage/medical-documents` et
  `@/lib/server/audit`.
- Le chiffrement/déchiffrement est appliqué **dans les Server Actions de la couche
  d'accès** (`consultation-note-actions.ts`, `medical-history-actions.ts`) :
  chiffrer juste avant `prisma.create/update`, déchiffrer juste après
  `findMany/find`. L'**export RGPD** (11.2) déchiffre le contenu pour livrer un
  JSON **lisible** (la portabilité art. 20 exige des données intelligibles).
- L'UI et les composants restent **inchangés** : ils reçoivent du clair, comme
  aujourd'hui. Aucune fuite : `summary` d'audit (11.3) ne contient jamais de
  contenu clinique.

## Conséquences

- **Défense en profondeur** : un dump SQL / une fuite de sauvegarde n'expose plus
  le contenu de `consultation_notes.content` ni `medical_history_entries.content`
  en clair (sans la clé hors base).
- **Recherche plein-texte impossible** sur les champs chiffrés (acceptable : aucune
  recherche n'est faite sur ces contenus ; la recherche patient porte sur
  nom/prénom/email, non chiffrés).
- **Étape ops hors boucle** : poser `DATA_ENCRYPTION_KEY` en production et,
  optionnellement, exécuter un backfill de ré-écriture des lignes en clair
  existantes. À documenter dans la story 11.4 comme livrable ops **non exécuté par
  la boucle** (garde-fou : aucune action infra distante automatisée).

## Cadrage RGPD / Sécurité (résiduel)

Avec **11.1** (consentement), **11.2** (droits du patient — export/effacement),
**11.3** (journal d'audit) et **11.4** (chiffrement applicatif), l'épopée 11 livre
le **socle RGPD côté code**. La **levée effective** de la réserve de production du
dossier patient (9.x) reste un **arbitrage PO/RGPD** conditionné aux **pré-requis
ops** (clé `DATA_ENCRYPTION_KEY` posée, migrations appliquées, bucket + RLS
Storage configurés) et à l'acceptation des **résiduels assumés** :

- champs cliniques **hors périmètre** non chiffrés (`Patient.notes`,
  `Appointment.*`, **binaire** des documents — chiffrement au repos fournisseur) ;
- pas de **rotation de clé** ni de **HSM/KMS** (clé en variable d'environnement) ;
- audit best-effort/non transactionnel (cf. 11.3, `AUDIT-BESTEFFORT-TX`).

[Source : prisma/schema.prisma (ConsultationNote 9.1, MedicalHistoryEntry 9.3),
docs/architecture/5-stockage-fichiers-decision.md (report explicite du chiffrement
en 11.4), docs/stories/11.2.droit-oubli-export.story.md (export lisible),
docs/stories/11.3.journal-audit.story.md (best-effort, périmètre RGPD)]
