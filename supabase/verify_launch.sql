-- Read-only inventory for the project owner. All record-level findings are aggregate counts.
begin transaction read only;
select schemaname, tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;
select schemaname,tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select id,public,file_size_limit,allowed_mime_types from storage.buckets
where id in ('student-notes','ca-materials','test-scripts');
select count(*) as note_references_outside_owner_folder from public.student_note_submissions
where (storage.foldername(file_path))[1] is distinct from user_id::text;
select count(*) as script_references_outside_owner_folder from public.evaluation_submissions
where (storage.foldername(file_path))[1] is distinct from user_id::text;
select level,chapter,count(*) as paper_count,
 count(*) filter(where description not like 'CAJ_PAPER_V1|%' or description is null) as legacy_metadata,
 count(*) filter(where file_path is not null and not exists
 (select 1 from storage.objects o where o.bucket_id=m.file_bucket and o.name=m.file_path)) as missing_objects
from public.materials m where category='icai_link' group by level,chapter order by level,chapter;
select count(*) filter(where email_confirmed_at is null) as unconfirmed_users,
 count(*) filter(where raw_app_meta_data->>'provider'='email') as email_provider_users from auth.users;
select count(*) as admin_count, count(*) filter(where exists(select 1 from auth.mfa_factors f
 where f.user_id=r.user_id and f.status='verified')) as admins_with_verified_factor
from public.user_roles r where role='admin';
rollback;
