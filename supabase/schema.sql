-- CA Junction Supabase schema
-- Free launch mode: checkout and paid access are disabled.
-- Run in the Supabase SQL Editor after creating a new project.
-- Keep service-role keys on a trusted server only; never put them in assets/config.js.

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','reviewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_role(required_role text, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles r where r.user_id = target_user and r.role = required_role) $$;

create or replace function public.is_admin(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role('admin', target_user) $$;

create or replace function public.is_reviewer(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role('admin', target_user) or public.has_role('reviewer', target_user) $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  ca_level text not null default 'Foundation' check (ca_level in ('Foundation','Intermediate','Final','Qualified')),
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles(user_id, full_name, ca_level)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), case when new.raw_user_meta_data->>'ca_level' in ('Foundation','Intermediate','Final','Qualified') then new.raw_user_meta_data->>'ca_level' else 'Foundation' end)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_ca_junction on auth.users;
create trigger on_auth_user_created_ca_junction
after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  level text not null check (level in ('Foundation','Intermediate','Final','All')),
  subject text not null default '',
  category text not null check (category in ('student_note','revision','mind_map','formula','icai_link')),
  file_bucket text,
  file_path text,
  external_url text,
  is_premium boolean not null default false,
  is_published boolean not null default false,
  submitted_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((file_path is not null) or (external_url is not null))
);

create table if not exists public.student_note_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  level text not null check (level in ('Foundation','Intermediate','Final')),
  subject text not null,
  description text not null default '',
  file_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text not null default '',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  level text not null check (level in ('Foundation','Intermediate','Final','All')),
  course_url text,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  level text not null check (level in ('Foundation','Intermediate','Final')),
  subject text not null default '',
  test_type text not null check (test_type in ('mcq','chapter','full_syllabus','evaluated')),
  part_label text not null default '',
  access_tier text not null default 'free' check (access_tier in ('free','premium')),
  duration_minutes integer not null default 60 check (duration_minutes between 1 and 600),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.study_tests(id) on delete cascade,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  correct_index integer not null check (correct_index >= 0),
  explanation text not null default '',
  position integer not null default 0,
  check (correct_index < jsonb_array_length(options))
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.study_tests(id) on delete cascade,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists public.evaluation_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.study_tests(id) on delete cascade,
  file_path text not null,
  status text not null default 'pending' check (status in ('pending','in_review','reviewed','rejected')),
  score numeric,
  feedback text not null default '',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null default '',
  location text not null default '',
  job_type text not null default 'Internship',
  description text not null default '',
  application_url text,
  contact_email text,
  is_premium boolean not null default false,
  is_published boolean not null default false,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type text not null check (service_type in ('study_consultation','resume_review','linkedin_review','interview_prep','articleship_guidance','career_counselling','job_application_guidance')),
  message text not null,
  status text not null default 'new' check (status in ('new','contacted','scheduled','complete','declined')),
  admin_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_on date,
  planned_minutes integer not null default 45 check (planned_minutes between 5 and 600),
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  product_type text not null check (product_type in ('membership','material','test','resume_service','career_service','consultation')),
  material_id uuid references public.materials(id) on delete set null,
  test_id uuid references public.study_tests(id) on delete set null,
  price_inr numeric(10,2) not null check (price_inr >= 0),
  duration_days integer check (duration_days is null or duration_days > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  amount_inr numeric(10,2) not null check (amount_inr >= 0),
  status text not null default 'initiated' check (status in ('initiated','pending_review','paid','rejected','cancelled')),
  upi_reference text,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  material_id uuid references public.materials(id) on delete cascade,
  test_id uuid references public.study_tests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, material_id, test_id)
);

create unique index if not exists entitlements_unique_target on public.entitlements(user_id,product_id,coalesce(material_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(test_id,'00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.material_downloads (
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  primary key (user_id, material_id)
);

create table if not exists public.premium_resources (
  id uuid primary key default gen_random_uuid(),
  resource_key text not null unique,
  label text not null,
  resource_url text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.has_active_membership(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.memberships m where m.user_id = target_user and m.expires_at > now()) $$;

create or replace function public.has_material_entitlement(target_user uuid, target_material uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.entitlements e where e.user_id = target_user and e.material_id = target_material) $$;

create or replace function public.has_test_entitlement(target_user uuid, target_test uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.entitlements e where e.user_id = target_user and e.test_id = target_test) $$;

create or replace function public.has_material_access(target_user uuid, target_material uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.materials where id=target_material and is_published) $$;

create or replace function public.register_material_download(target_material uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to download notes.'; end if;
  if not public.has_material_access(auth.uid(),target_material) then raise exception 'This resource is not published.'; end if;
  if exists(select 1 from public.materials m where m.id=target_material and m.external_url is not null) then return true; end if;
  insert into public.material_downloads(user_id,material_id) values(auth.uid(),target_material) on conflict do nothing;
  return true;
end $$;

create or replace function public.create_payment_order(target_product uuid)
returns uuid language plpgsql security definer set search_path = public
as $$ begin raise exception 'Payments are disabled while CA Junction is free.'; end $$;

create or replace function public.submit_upi_reference(target_order uuid, reference text)
returns void language plpgsql security definer set search_path = public
as $$ begin raise exception 'Payments are disabled while CA Junction is free.'; end $$;

create or replace function public.create_mcq_attempt(target_test uuid, submitted_answers jsonb)
returns table(attempt_id uuid, points integer, question_count integer)
language plpgsql security definer set search_path = public
as $$
declare new_attempt uuid; earned integer; total integer;
begin
  if auth.uid() is null then raise exception 'Sign in to take a test.'; end if;
  if submitted_answers is null or jsonb_typeof(submitted_answers) <> 'object' then raise exception 'Answers must be submitted as a question-response object.'; end if;
  if not exists(select 1 from public.study_tests t where t.id=target_test and t.is_published and t.test_type in ('mcq','chapter','full_syllabus')) then raise exception 'This test is not available.'; end if;
  select count(*),count(*) filter(where q.correct_index = (submitted_answers->>q.id::text)::integer)
  into total,earned from public.test_questions q where q.test_id=target_test;
  if total=0 then raise exception 'This test has no published questions.'; end if;
  insert into public.test_attempts(user_id,test_id,score,total_questions,answers)
  values(auth.uid(),target_test,coalesce(earned,0),total,coalesce(submitted_answers,'{}'::jsonb))
  returning id into new_attempt;
  return query select new_attempt,coalesce(earned,0),total;
end $$;

create or replace function public.grant_purchase_access()
returns trigger language plpgsql security definer set search_path = public
as $$
declare p public.products%rowtype;
begin
  if new.status='paid' then raise exception 'Paid access is disabled while CA Junction is free.'; end if;
  if new.status='paid' and (new.upi_reference is null or length(trim(new.upi_reference)) < 8) then raise exception 'A bank/UPI reference must be reviewed before approval.'; end if;
  if new.status='paid' and new.verified_by is null then new.verified_by := auth.uid(); end if;
  if new.status='paid' and new.verified_by is null then raise exception 'An admin verifier is required.'; end if;
  if new.status='paid' and old.status is distinct from 'paid' then
    select * into p from public.products where id=new.product_id;
    if p.product_type='membership' then
      insert into public.memberships(user_id,starts_at,expires_at,updated_at)
      values(new.user_id,now(),now()+make_interval(days=>coalesce(p.duration_days,30)),now())
      on conflict(user_id) do update set starts_at=case when public.memberships.expires_at>now() then public.memberships.starts_at else now() end,
      expires_at=greatest(public.memberships.expires_at,now())+make_interval(days=>coalesce(p.duration_days,30)),updated_at=now();
    else
      insert into public.entitlements(user_id,product_id,material_id,test_id)
      values(new.user_id,p.id,p.material_id,p.test_id)
      on conflict do nothing;
    end if;
    new.verified_at=now();
  end if;
  return new;
end $$;

drop trigger if exists payment_order_grant_access on public.payment_orders;
create trigger payment_order_grant_access before update of status on public.payment_orders
for each row execute procedure public.grant_purchase_access();

create or replace view public.published_test_questions with (security_barrier=true) as
select q.id,q.test_id,q.question,q.options,q.position
from public.test_questions q join public.study_tests t on t.id=q.test_id
where t.is_published and t.test_type in ('mcq','chapter','full_syllabus');

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.student_note_submissions enable row level security;
alter table public.courses enable row level security;
alter table public.study_tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.evaluation_submissions enable row level security;
alter table public.jobs enable row level security;
alter table public.service_requests enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.products enable row level security;
alter table public.payment_orders enable row level security;
alter table public.memberships enable row level security;
alter table public.entitlements enable row level security;
alter table public.material_downloads enable row level security;
alter table public.premium_resources enable row level security;

drop policy if exists "roles self or admin read" on public.user_roles;
create policy "roles self or admin read" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages roles" on public.user_roles;
create policy "admin manages roles" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profile owner read" on public.profiles;
create policy "profile owner read" on public.profiles for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published accessible materials" on public.materials;
create policy "published accessible materials" on public.materials for select to anon,authenticated using (is_published or public.is_admin());
drop policy if exists "admin manages materials" on public.materials;
create policy "admin manages materials" on public.materials for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "student reads own submissions" on public.student_note_submissions;
create policy "student reads own submissions" on public.student_note_submissions for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "student submits own notes" on public.student_note_submissions;
create policy "student submits own notes" on public.student_note_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending');
drop policy if exists "admin reviews note submissions" on public.student_note_submissions;
create policy "admin reviews note submissions" on public.student_note_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published courses readable" on public.courses;
create policy "published courses readable" on public.courses for select to anon,authenticated using (is_published or public.is_admin());
drop policy if exists "admin manages courses" on public.courses;
create policy "admin manages courses" on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "accessible tests readable" on public.study_tests;
create policy "accessible tests readable" on public.study_tests for select to authenticated using (is_published or public.is_admin());
drop policy if exists "admin manages tests" on public.study_tests;
create policy "admin manages tests" on public.study_tests for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "question keys admin only" on public.test_questions;
create policy "question keys admin only" on public.test_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "attempt owner or reviewer read" on public.test_attempts;
create policy "attempt owner or reviewer read" on public.test_attempts for select to authenticated using (user_id=auth.uid() or public.is_reviewer());

drop policy if exists "script owner or reviewer read" on public.evaluation_submissions;
create policy "script owner or reviewer read" on public.evaluation_submissions for select to authenticated using (user_id=auth.uid() or public.is_reviewer());
drop policy if exists "script owner insert" on public.evaluation_submissions;
create policy "script owner insert" on public.evaluation_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending');
drop policy if exists "reviewer grades scripts" on public.evaluation_submissions;
create policy "reviewer grades scripts" on public.evaluation_submissions for update to authenticated using (public.is_reviewer()) with check (public.is_reviewer());

drop policy if exists "published jobs members only" on public.jobs;
create policy "published jobs members only" on public.jobs for select to authenticated using (is_published or public.is_admin());
drop policy if exists "admin manages jobs" on public.jobs;
create policy "admin manages jobs" on public.jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own service requests" on public.service_requests;
create policy "own service requests" on public.service_requests for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "create service requests" on public.service_requests;
create policy "create service requests" on public.service_requests for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "admin manages requests" on public.service_requests;
create policy "admin manages requests" on public.service_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own study plans" on public.study_plans;
create policy "own study plans" on public.study_plans for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "own study sessions" on public.study_sessions;
create policy "own study sessions" on public.study_sessions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "active products readable" on public.products;
create policy "active products readable" on public.products for select to anon,authenticated using (is_active or public.is_admin());
drop policy if exists "admin manages products" on public.products;
create policy "admin manages products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own payment orders read" on public.payment_orders;
create policy "own payment orders read" on public.payment_orders for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admin verifies payments" on public.payment_orders;
create policy "admin verifies payments" on public.payment_orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own membership read" on public.memberships;
create policy "own membership read" on public.memberships for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages membership" on public.memberships;
create policy "admin manages membership" on public.memberships for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "own entitlements read" on public.entitlements;
create policy "own entitlements read" on public.entitlements for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "own downloads read" on public.material_downloads;
create policy "own downloads read" on public.material_downloads for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "own downloads insert" on public.material_downloads;
create policy "own downloads insert" on public.material_downloads for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "premium resources members" on public.premium_resources;
create policy "premium resources members" on public.premium_resources for select to authenticated using (is_active or public.is_admin());
drop policy if exists "admin manages premium resources" on public.premium_resources;
create policy "admin manages premium resources" on public.premium_resources for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.register_material_download(uuid) to authenticated;
grant execute on function public.create_payment_order(uuid) to authenticated;
grant execute on function public.submit_upi_reference(uuid,text) to authenticated;
grant execute on function public.create_mcq_attempt(uuid,jsonb) to authenticated;
grant select on public.published_test_questions to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
('ca-materials','ca-materials',false,52428800,array['application/pdf']),
('student-notes','student-notes',false,10485760,array['application/pdf']),
('test-scripts','test-scripts',false,26214400,array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "private material access" on storage.objects;
create policy "private material access" on storage.objects for select to authenticated using (
  bucket_id='ca-materials' and (public.is_admin() or exists(select 1 from public.materials m where m.file_bucket='ca-materials' and m.file_path=name and public.has_material_access(auth.uid(),m.id)))
);
drop policy if exists "admin material upload" on storage.objects;
create policy "admin material upload" on storage.objects for insert to authenticated with check (bucket_id='ca-materials' and public.is_admin());
drop policy if exists "admin material edit" on storage.objects;
create policy "admin material edit" on storage.objects for update to authenticated using (bucket_id='ca-materials' and public.is_admin()) with check (bucket_id='ca-materials' and public.is_admin());
drop policy if exists "admin material delete" on storage.objects;
create policy "admin material delete" on storage.objects for delete to authenticated using (bucket_id='ca-materials' and public.is_admin());

drop policy if exists "student upload own notes" on storage.objects;
create policy "student upload own notes" on storage.objects for insert to authenticated with check (bucket_id='student-notes' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "student or admin reads note uploads" on storage.objects;
create policy "student or admin reads note uploads" on storage.objects for select to authenticated using (bucket_id='student-notes' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
drop policy if exists "student upload own test script" on storage.objects;
create policy "student upload own test script" on storage.objects for insert to authenticated with check (bucket_id='test-scripts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "owner or reviewer reads test scripts" on storage.objects;
create policy "owner or reviewer reads test scripts" on storage.objects for select to authenticated using (bucket_id='test-scripts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_reviewer()));
drop policy if exists "admin deletes student uploads" on storage.objects;
create policy "admin deletes student uploads" on storage.objects for delete to authenticated using (bucket_id in ('student-notes','test-scripts') and public.is_admin());

-- After the owner creates their account, promote that exact account manually:
-- insert into public.user_roles(user_id, role)
-- select id, 'admin' from auth.users where email = 'YOUR_ADMIN_EMAIL'
-- on conflict do nothing;
-- Never assign admin roles from the browser or expose a service-role key.
