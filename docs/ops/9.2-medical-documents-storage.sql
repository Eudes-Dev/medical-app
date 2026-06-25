-- =============================================================================
-- Provisioning Supabase Storage — Story 9.2 (Documents médicaux)
-- -----------------------------------------------------------------------------
-- Étape OPS hors boucle BMAD (cf. ADR docs/architecture/5-stockage-fichiers-decision.md §5).
-- À exécuter UNE fois dans : Supabase Dashboard > SQL Editor (projet klvhldlerkgrrtyabyeg).
--
-- Contexte technique (déterminant pour les politiques) :
--   L'abstraction lib/storage/medical-documents.ts appelle Supabase Storage via
--   lib/supabase/server.ts = client SSR avec la clé ANON + la session du praticien.
--   => toutes les opérations (createSignedUploadUrl / createSignedUrl / remove)
--      s'exécutent sous le rôle `authenticated`. Les politiques RLS ci-dessous
--      autorisent donc ce rôle sur le bucket privé `medical-documents`.
--   Single-tenant : un seul praticien connecté => pas de cloisonnement par dossier.
-- =============================================================================

-- 1) Bucket PRIVÉ + garde-fous (taille 10 Mo, MIME allowlist alignés sur le Zod).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-documents',
  'medical-documents',
  false,                                              -- privé : aucune URL publique
  10485760,                                           -- 10 Mo (= 10 * 1024 * 1024)
  array['application/pdf', 'image/jpeg', 'image/png'] -- = MEDICAL_DOCUMENT_ALLOWED_MIME
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Politiques RLS sur storage.objects, restreintes à ce bucket, rôle authenticated.
--    (RLS est déjà activé par défaut sur storage.objects dans Supabase.)

-- INSERT : nécessaire pour createSignedUploadUrl (création de l'URL d'upload signée).
drop policy if exists "medical_docs_insert_authenticated" on storage.objects;
create policy "medical_docs_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-documents');

-- SELECT : nécessaire pour createSignedUrl (URL de lecture signée / téléchargement).
drop policy if exists "medical_docs_select_authenticated" on storage.objects;
create policy "medical_docs_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'medical-documents');

-- DELETE : nécessaire pour remove (suppression de l'objet + rollback d'upload).
drop policy if exists "medical_docs_delete_authenticated" on storage.objects;
create policy "medical_docs_delete_authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'medical-documents');

-- 3) Vérifications (doivent renvoyer le bucket privé + 3 politiques).
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'medical-documents';

select policyname, cmd, roles
  from pg_policies
 where schemaname = 'storage'
   and tablename  = 'objects'
   and policyname like 'medical_docs_%'
 order by policyname;
