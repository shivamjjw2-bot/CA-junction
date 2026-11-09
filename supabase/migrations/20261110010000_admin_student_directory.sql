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

revoke all on function public.admin_student_directory() from public, anon, authenticated;
grant execute on function public.admin_student_directory() to authenticated;
