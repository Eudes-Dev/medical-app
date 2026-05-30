# 2026-05-30 — Procédure de migration en production

**Origine :** finding OPS-001 (rapport PO 2026-05-30) — [Story 5.3](../stories/5.3.consolidation-pre-prod.story.md) AC 10-11.
**Statut :** procédure de référence (à exécuter au déploiement — **action ops**, jamais automatique sur base live).

## Migrations présentes dans `prisma/migrations/` (vérifié 2026-05-30, story 5.3)
Ordre chronologique :
1. `20260126014944_init` — User / Patient / Appointment + enum AppointmentStatus
2. `20260521000001_add_cancellation_token_and_email_log` (6.1)
3. `20260521000002_add_email_log_appointment_fk` (6.1)
4. `20260526000001_rename_emaillog_to_messagelog` (6.3)
5. `20260526000002_add_unique_provider_message_id` (6.3)
6. `20260526000003_add_working_hours` (7.1)
7. `20260527000004_add_time_off` (7.2)
8. `20260528000005_add_service_types` (7.3)
9. `20260530000006_add_reminders_optout` (**story 6.2, matérialisée en 5.3 — voir ci-dessous**)

> ⚠️ **Divergence OPS-001 corrigée (story 5.3).** Au moment de la vérification, la
> migration des **rappels automatiques (story 6.2)** — `reminder_opt_out`,
> `opt_out_token`, `reminder_d1_sent_at`, `reminder_h2_sent_at`, et les valeurs
> d'enum `REMINDER_D1`/`REMINDER_H2` — était **absente** de `prisma/migrations/`
> alors que le schéma Prisma les déclare. Elle avait été appliquée en dev via
> `prisma db push` sans fichier SQL. Sur une base **neuve** (prod),
> `prisma migrate deploy` n'aurait donc pas créé ces objets → échec du cron de
> rappels (6.2) et du lien de désinscription.
>
> ➡️ **Remédiation livrée** : la migration `20260530000006_add_reminders_optout`
> reconstitue ce diff de façon **idempotente** (`IF NOT EXISTS`). Deux cas :
> - **Base dev déjà alignée** (objets créés par `db push`) : marquer la migration
>   comme déjà appliquée **sans la rejouer** :
>   `npx prisma migrate resolve --applied 20260530000006_add_reminders_optout`.
> - **Base neuve (prod)** : `prisma migrate deploy` l'applique normalement.

> ⚠️ Plusieurs migrations ont été appliquées en **dev** via `prisma db push` +
> `prisma migrate resolve --applied`. En **prod**, c'est `prisma migrate deploy`
> qui rejoue le SQL. D'où l'importance de vérifier que chaque migration est bien
> matérialisée en fichier (cf. divergence OPS-001 ci-dessus).

## État `prisma migrate status` (sandbox dev, 2026-05-30)
`npx prisma migrate status` n'a **pas pu être exécuté** depuis l'environnement de
développement : la base Supabase cible était injoignable (`P1001: Can't reach
database server …:5432`). Conforme à AC 11 (aucune action sur la base live depuis
la story de dev). **L'ops doit exécuter `prisma migrate status` sur l'environnement
cible** avant/après `migrate deploy` (cf. procédure ci-dessous) et confirmer
« Database schema is up to date! ».

## Procédure de déploiement

```bash
# 1. Vérifier l'état AVANT (sur l'environnement cible)
npx prisma migrate status

# 1.bis (UNIQUEMENT sur une base PRÉ-EXISTANTE alignée via db push — ex. dev) :
#   réconcilier la migration des rappels matérialisée tardivement, SANS la rejouer.
#   À NE PAS faire sur une base neuve (prod) — migrate deploy l'appliquera.
# npx prisma migrate resolve --applied 20260530000006_add_reminders_optout

# 2. Appliquer les migrations en attente
npx prisma migrate deploy

# 3. Régénérer le client (si build séparé)
npx prisma generate

# 4. Seed des horaires par défaut SI la table working_hours est vide
#    (Lun→Ven 08:00–18:00 / 30 min ; Sam/Dim fermés)
npm run seed:working-hours

# 5. Vérifier l'état APRÈS
npx prisma migrate status   # attendu : "Database schema is up to date!"
```

## Points de vigilance
- **`working_hours` vide ⇒ tunnel sans créneaux.** Le seed (étape 4) est indispensable au premier déploiement.
- **Fériés (`time_off` HOLIDAY)** : matérialisés à la demande à l'ouverture de `/dashboard/settings/timeoff` (pas de seed requis).
- **Rename `email_logs → message_logs`** : la migration `20260526000001` doit jouer le `ALTER TABLE … RENAME` sur une base qui possède encore `email_logs`. Si la base prod n'a jamais eu `email_logs` (créée après 6.3 via `db push`), vérifier que `migrate deploy` ne rejoue pas un rename sur une table absente — marquer la migration `resolve --applied` si l'état cible est déjà atteint.
- **Variables d'env requises en prod** : `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_*`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `PRACTITIONER_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, (SMS off par défaut : `SMS_ENABLED=false`).
