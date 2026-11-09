-- Allow admins to remove contributor upload records after cleanup from the admin panel.
drop policy if exists "admin deletes student submissions" on public.student_note_submissions;
create policy "admin deletes student submissions" on public.student_note_submissions
for delete to authenticated using (public.is_admin());

-- Let a verified admin grant or revoke admin access by an existing account email.
create or replace function public.admin_manage_admin(target_email text, grant_admin boolean)
returns text language plpgsql security definer set search_path = ''
as $admin_manage$
declare
  requester uuid := auth.uid();
  target uuid;
  admin_count integer;
begin
  if requester is null or not public.is_admin(requester) then raise exception 'Only an admin can manage admin access.'; end if;
  if target_email is null or length(trim(target_email)) < 3 then raise exception 'Enter the email address of an existing account.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ca-junction-admin-role-management', 0));
  select u.id into target from auth.users u where lower(u.email)=lower(trim(target_email)) order by u.created_at limit 1;
  if target is null then raise exception 'No registered account was found for that email. Ask them to create an account first.'; end if;
  if grant_admin then
    insert into public.user_roles(user_id,role) values(target,'admin') on conflict(user_id,role) do nothing;
    return 'Admin access is active for '||trim(target_email)||'.';
  end if;
  if target=requester then raise exception 'You cannot remove your own admin access.'; end if;
  select count(*) into admin_count from public.user_roles where role='admin';
  if admin_count<=1 then raise exception 'The last admin account cannot be removed.'; end if;
  delete from public.user_roles where user_id=target and role='admin';
  if not found then return 'That account does not currently have admin access.'; end if;
  return 'Admin access was removed from '||trim(target_email)||'.';
end;
$admin_manage$;

revoke all on function public.admin_manage_admin(text,boolean) from public,anon,authenticated;
grant execute on function public.admin_manage_admin(text,boolean) to authenticated;
