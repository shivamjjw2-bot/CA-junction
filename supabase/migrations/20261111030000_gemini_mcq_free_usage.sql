-- Track Gemini MCQ requests per signed-in student without imposing the old neuron cap.
-- The Gemini free-tier project quota remains Google-managed and shared across CA Junction.
create table if not exists public.ca_ai_mcq_daily_usage (
  usage_day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (usage_day, user_id)
);

create index if not exists ca_ai_mcq_daily_usage_user_idx
  on public.ca_ai_mcq_daily_usage (user_id, usage_day desc);

alter table public.ca_ai_mcq_daily_usage enable row level security;
revoke all on public.ca_ai_mcq_daily_usage from public, anon, authenticated;

create or replace function public.log_ca_ai_mcq_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user uuid := auth.uid();
  today_ist date := timezone('Asia/Kolkata', now())::date;
begin
  if request_user is null then
    return false;
  end if;

  insert into public.ca_ai_mcq_daily_usage (usage_day, user_id, request_count, last_used_at)
  values (today_ist, request_user, 1, now())
  on conflict (usage_day, user_id) do update
    set request_count = public.ca_ai_mcq_daily_usage.request_count + 1,
        last_used_at = now();

  return true;
end;
$$;

revoke all on function public.log_ca_ai_mcq_request() from public, anon, authenticated;
grant execute on function public.log_ca_ai_mcq_request() to authenticated;

create or replace function public.admin_ai_mcq_usage_today()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today_ist date := timezone('Asia/Kolkata', now())::date;
  total_requests integer;
  student_rows jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required.';
  end if;

  select coalesce(sum(u.request_count), 0)::integer
    into total_requests
    from public.ca_ai_mcq_daily_usage u
   where u.usage_day = today_ist;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.request_count desc, t.last_used_at desc), '[]'::jsonb)
    into student_rows
    from (
      select u.user_id,
             coalesce(nullif(p.full_name, ''), 'Student') as full_name,
             au.email,
             coalesce(p.ca_level, 'Unknown') as ca_level,
             u.request_count,
             u.last_used_at
        from public.ca_ai_mcq_daily_usage u
        join auth.users au on au.id = u.user_id
        left join public.profiles p on p.user_id = u.user_id
       where u.usage_day = today_ist
    ) t;

  return jsonb_build_object(
    'usage_day', today_ist,
    'request_count', total_requests,
    'users', student_rows
  );
end;
$$;

revoke all on function public.admin_ai_mcq_usage_today() from public, anon, authenticated;
grant execute on function public.admin_ai_mcq_usage_today() to authenticated;
