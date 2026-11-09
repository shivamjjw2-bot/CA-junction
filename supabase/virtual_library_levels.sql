-- Run once in the Supabase SQL Editor for the existing CA Junction project.
-- This lets students open the three active Virtual Library room links without an account.
drop policy if exists "public study room links" on public.premium_resources;
create policy "public study room links"
on public.premium_resources
for select
to anon, authenticated
using (
  is_active
  and resource_key in (
    'virtual_library',
    'virtual_library_foundation',
    'virtual_library_intermediate',
    'virtual_library_final',
    'doubt_solving'
  )
);
