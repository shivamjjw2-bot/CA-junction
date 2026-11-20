create or replace function public.has_role(required_role text, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select target_user = auth.uid()
    and exists (select 1 from public.user_roles r where r.user_id = target_user and r.role = required_role)
    and (
      auth.jwt()->>'aal' = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f where f.user_id = target_user and f.status = 'verified'
      )
    )
$$;
