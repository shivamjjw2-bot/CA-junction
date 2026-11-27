create table public.paper_practice (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 material_id uuid not null references public.materials(id) on delete cascade,
 status text not null check(status in ('Practising','Attempted','Reviewed','Reattempt')),
 updated_at timestamptz not null default now(),
 primary key(user_id,material_id)
);
alter table public.paper_practice enable row level security;
revoke all on public.paper_practice from public,anon,authenticated;
grant select,insert(user_id,material_id,status),update(status,user_id,material_id) on public.paper_practice to authenticated;
create policy own_records on public.paper_practice for select to authenticated using(user_id=(select auth.uid()));
create policy add_own_practice on public.paper_practice for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.materials m where m.id=material_id and m.is_published and not m.is_premium and m.chapter in ('previous_year_question','mtp_question','rtp_question','mock_test_question'))
);
create policy update_own_practice on public.paper_practice for update to authenticated using(user_id=(select auth.uid())) with check(
 user_id=(select auth.uid()) and exists(select 1 from public.materials m where m.id=material_id and m.is_published and not m.is_premium and m.chapter in ('previous_year_question','mtp_question','rtp_question','mock_test_question'))
);
create function ca_access.stamp_practice() returns trigger language plpgsql set search_path='' as $$
begin
 if new.user_id<>old.user_id or new.material_id<>old.material_id then raise exception 'Practice identity cannot change';end if;
 new.updated_at=now();return new;
end $$;
create trigger stamp_practice before update on public.paper_practice for each row execute function ca_access.stamp_practice();