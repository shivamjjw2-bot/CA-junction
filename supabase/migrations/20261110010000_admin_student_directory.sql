-- Expose basic student account details to verified CA Junction admins only.
-- The function intentionally does not expose passwords, password hashes, phone numbers, or auth secrets.
create or replace function public.admin_student_directory()
returns table(user_id uuid, email text, full_name text, ca_level text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, coalesce(p.full_name, ''), coalesce(p.ca_level, 'Foundation'), u.created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where public.is_admin(auth.uid())
  order by u.created_at desc
  limit 1000;
$$;

-- Aggregate-only activity totals for the admin overview; no per-student activity is returned.
create or replace function public.admin_platform_overview()
returns table(student_count bigint, new_students_7d bigint, study_sessions_30d bigint, study_seconds_30d bigint, published_materials bigint, pending_notes bigint, published_opportunities bigint, open_requests bigint)
language sql
stable
security definer
set search_path = ''
as $
  select
    (select count(*) from auth.users),
    (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    (select count(*) from public.study_sessions where started_at >= now() - interval '30 days'),
    (select coalesce(sum(duration_seconds), 0)::bigint from public.study_sessions where started_at >= now() - interval '30 days'),
    (select count(*) from public.materials where is_published),
    (select count(*) from public.student_note_submissions where status = 'pending'),
    (select count(*) from public.jobs where is_published),
    (select count(*) from public.service_requests where status in ('new','contacted','scheduled'))
  where public.is_admin(auth.uid());
$;

revoke all on function public.admin_platform_overview() from public, anon, authenticated;
grant execute on function public.admin_platform_overview() to authenticated;

revoke all on function public.admin_student_directory() from public, anon, authenticated;
grant execute on function public.admin_student_directory() to authenticated;
