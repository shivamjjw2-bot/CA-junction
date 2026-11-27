-- Signed, student-owned processing checkpoints; never trust client-written payloads.
create table public.trend_document_checkpoints (
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  payload text not null check (octet_length(payload) <= 450000),
  signature text not null check (signature ~ '^[a-f0-9]{64}$'),
  primary key (user_id, material_id)
);
create index trend_document_checkpoints_material_idx on public.trend_document_checkpoints(material_id);
alter table public.trend_document_checkpoints enable row level security;
revoke all on public.trend_document_checkpoints from public, anon, authenticated;
grant select, insert, update, delete on public.trend_document_checkpoints to authenticated;
create policy "student reads own trend checkpoint" on public.trend_document_checkpoints
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "student saves own eligible paper checkpoint" on public.trend_document_checkpoints
  for insert to authenticated with check ((select auth.uid()) = user_id and exists (
    select 1 from public.materials m where m.id=material_id and m.is_published and not m.is_premium
      and m.category='icai_link' and m.chapter='previous_year_question'));
create policy "student updates own eligible paper checkpoint" on public.trend_document_checkpoints
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.materials m where m.id=material_id and m.is_published and not m.is_premium
      and m.category='icai_link' and m.chapter='previous_year_question'));
create policy "student removes own trend checkpoint" on public.trend_document_checkpoints
  for delete to authenticated using ((select auth.uid()) = user_id);
