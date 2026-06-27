-- =============================================================================
-- Cron des rappels de RDV via Supabase (pg_cron + pg_net) — OPS hors boucle BMAD
-- -----------------------------------------------------------------------------
-- Pourquoi : le plan Hobby de Vercel limite les Cron Jobs à 1/jour, or la route
-- /api/cron/reminders doit être appelée CHAQUE HEURE :
--   - rappel J-1 : le handler n'agit qu'à 17h UTC (il filtre lui-même l'heure) ;
--   - rappel H-2 : fenêtre glissante [now+1h50, now+2h10] => passage horaire requis.
-- Le cron a donc été retiré de vercel.json. Ici, c'est la base Supabase (déjà
-- présente) qui s'auto-appelle chaque heure via pg_net — 100% gratuit, sans tiers.
--
-- À exécuter UNE fois dans : Supabase Dashboard > SQL Editor (projet klvhldlerkgrrtyabyeg).
-- Les sections marquées 🧑‍🔧 demandent de remplacer une valeur avant exécution.
--
-- Fuseau : sur Supabase, pg_cron évalue les schedules en UTC, ce qui correspond
-- au `nowUtc.getUTCHours() === 17` du handler. (Vérifiable via `show timezone;`.)
-- =============================================================================

-- 1) Extensions nécessaires.
--    pg_cron : planification ; pg_net : appel HTTP sortant depuis Postgres.
--    (Activables aussi via Dashboard > Database > Extensions.)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Secrets dans Supabase Vault (chiffrés au repos) — 🧑‍🔧 REMPLACER LES VALEURS.
--    On ne met JAMAIS le CRON_SECRET en clair dans la définition du job (cron.job
--    est lisible) : le job lit le secret depuis le Vault à l'exécution.
--
--    - app_base_url : URL de production SANS slash final (ex. https://medical-app.vercel.app)
--    - cron_secret  : MÊME valeur que la variable d'env CRON_SECRET sur Vercel
--                     (le handler exige `Authorization: Bearer <CRON_SECRET>`).
--
--    Idempotent : si le secret existe déjà, on met à jour sa valeur.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'app_base_url') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'app_base_url'),
      'https://REMPLACER-PAR-URL-PROD.vercel.app'            -- 🧑‍🔧
    );
  else
    perform vault.create_secret(
      'https://REMPLACER-PAR-URL-PROD.vercel.app',           -- 🧑‍🔧
      'app_base_url',
      'URL prod pour le cron des rappels de RDV'
    );
  end if;

  if exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'cron_secret'),
      'REMPLACER-PAR-LE-CRON_SECRET-VERCEL'                  -- 🧑‍🔧
    );
  else
    perform vault.create_secret(
      'REMPLACER-PAR-LE-CRON_SECRET-VERCEL',                 -- 🧑‍🔧
      'cron_secret',
      'Bearer attendu par /api/cron/reminders (= CRON_SECRET Vercel)'
    );
  end if;
end $$;

-- 3) Planifier l'appel horaire. Idempotent : on retire un éventuel job existant
--    du même nom avant de le (re)créer.
select cron.unschedule('medical-reminders-hourly')
  where exists (select 1 from cron.job where jobname = 'medical-reminders-hourly');

select cron.schedule(
  'medical-reminders-hourly',
  '0 * * * *',                                              -- chaque heure, minute 0 (UTC)
  $cmd$
  select net.http_get(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
               || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $cmd$
);

-- 4) Vérifications.
--    a) Le job est bien planifié :
select jobid, jobname, schedule, active
  from cron.job
 where jobname = 'medical-reminders-hourly';

--    b) Déclenchement manuel pour tester tout de suite (sans attendre l'heure pleine) :
--       select net.http_get(
--         url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url') || '/api/cron/reminders',
--         headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
--       );
--       -- Puis consulter la réponse (status 200 + corps {"ok":true,...}) :
--       select id, status_code, content
--         from net._http_response
--        order by created desc
--        limit 5;

--    c) Historique d'exécution du cron (succès/échecs) :
--       select status, return_message, start_time, end_time
--         from cron.job_run_details
--        where jobid = (select jobid from cron.job where jobname = 'medical-reminders-hourly')
--        order by start_time desc
--        limit 10;

-- -----------------------------------------------------------------------------
-- Pour DÉSACTIVER le cron plus tard :
--   select cron.unschedule('medical-reminders-hourly');
-- =============================================================================
