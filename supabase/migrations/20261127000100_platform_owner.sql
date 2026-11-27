create schema if not exists ca_access;
revoke all on schema ca_access from public, anon, authenticated;
create table ca_access.platform_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid unique not null references auth.users(id) on delete restrict
);
revoke all on ca_access.platform_owner from public, anon, authenticated;
alter table ca_access.platform_owner enable row level security;

create function public.is_platform_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin(auth.uid()) and exists(select 1 from ca_access.platform_owner where user_id=auth.uid())
$$;
revoke all on function public.is_platform_owner() from public,anon;
grant execute on function public.is_platform_owner() to authenticated;

create or replace function public.admin_manage_admin(target_email text, grant_admin boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not public.is_platform_owner() then
    raise exception 'Only the platform owner can manage administrator access.' using errcode='42501';
  end if;
  if grant_admin is null then raise exception 'Select an action.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ca-junction-admin-role-management',0));
  select u.id into strict target from auth.users u
  where lower(u.email)=lower(trim(target_email))
    and u.email_confirmed_at is not null
    and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'
      and lower(i.identity_data->>'email')=lower(u.email) and i.identity_data->>'email_verified'='true');
  if grant_admin then
    insert into public.user_roles(user_id,role) values(target,'admin') on conflict(user_id,role) do nothing;
    return 'Administrator access is active.';
  end if;
  if target=auth.uid() then raise exception 'The owner cannot be removed.'; end if;
  delete from public.user_roles where user_id=target and role='admin';
  return 'Administrator access removed.';
exception when no_data_found then raise exception 'A verified Google account is required.';
end;
$$;
revoke all on function public.admin_manage_admin(text,boolean) from public,anon;
grant execute on function public.admin_manage_admin(text,boolean) to authenticated;
revoke insert,update,delete,truncate on public.user_roles from public,anon,authenticated;
-- Bind the verified owner's existing auth.users UUID through the database administrator.
-- Until that binding is present, all app-level role management is denied.
