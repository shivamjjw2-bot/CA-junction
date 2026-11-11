-- Attribute each accepted AI quota reservation to the signed-in student.
-- This preserves the shared 9,000 estimated-neuron cap and India-day reset.
create table if not exists public.ca_ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('ai_mcq','ai_planner')),
  estimated_neurons integer not null check (estimated_neurons in (1500,2000)),
  created_at timestamptz not null default now()
);

create index if not exists ca_ai_usage_events_created_at_idx
  on public.ca_ai_usage_events (created_at desc);
create index if not exists ca_ai_usage_events_user_created_idx
  on public.ca_ai_usage_events (user_id, created_at desc);

alter table public.ca_ai_usage_events enable row level security;
revoke all on public.ca_ai_usage_events from public, anon, authenticated;

-- Drop the prior one-argument overload so PostgREST cannot see ambiguous RPCs.
drop function if exists public.reserve_ca_ai_neurons(integer);
create or replace function public.reserve_ca_ai_neurons(p_neurons integer, p_feature text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_total integer;
  today_ist date := timezone('Asia/Kolkata', now())::date;
  request_user uuid := auth.uid();
begin
  if request_user is null
     or p_neurons is null
     or p_neurons not in (1500, 2000)
     or p_feature not in ('ai_mcq','ai_planner') then
    return false;
  end if;

  delete from public.ca_ai_daily_usage
  where usage_day < today_ist;

  insert into public.ca_ai_daily_usage as current_usage (usage_day, estimated_neurons)
  values (today_ist, p_neurons)
  on conflict (usage_day) do update
    set estimated_neurons = current_usage.estimated_neurons + p_neurons
    where current_usage.estimated_neurons + p_neurons <= 9000
  returning estimated_neurons into reserved_total;

  if reserved_total is null then
    return false;
  end if;

  insert into public.ca_ai_usage_events (user_id, feature, estimated_neurons)
  values (request_user, p_feature, p_neurons);

  return true;
end;
$$;

revoke all on function public.reserve_ca_ai_neurons(integer, text) from public, anon, authenticated;
grant execute on function public.reserve_ca_ai_neurons(integer, text) to authenticated;

create or replace function public.admin_ai_usage_today()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today_ist date := timezone('Asia/Kolkata', now())::date;
  day_start timestamptz := today_ist::timestamp at time zone 'Asia/Kolkata';
  day_end timestamptz := (today_ist + 1)::timestamp at time zone 'Asia/Kolkata';
  total_neurons integer;
  student_rows jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required.';
  end if;

  select coalesce(u.estimated_neurons, 0)
    into total_neurons
    from public.ca_ai_daily_usage u
   where u.usage_day = today_ist;
  total_neurons := coalesce(total_neurons, 0);

  select coalesce(jsonb_agg(to_jsonb(t) order by t.estimated_neurons desc, t.last_used_at desc), '[]'::jsonb)
    into student_rows
    from (
      select e.user_id,
             coalesce(nullif(p.full_name, ''), 'Student') as full_name,
             au.email,
             coalesce(p.ca_level, 'Unknown') as ca_level,
             count(*)::integer as request_count,
             sum(e.estimated_neurons)::integer as estimated_neurons,
             max(e.created_at) as last_used_at
        from public.ca_ai_usage_events e
        join auth.users au on au.id = e.user_id
        left join public.profiles p on p.user_id = e.user_id
       where e.created_at >= day_start and e.created_at < day_end
       group by e.user_id, p.full_name, au.email, p.ca_level
    ) t;

  return jsonb_build_object(
    'usage_day', today_ist,
    'estimated_neurons', total_neurons,
    'cap', 9000,
    'users', student_rows
  );
end;
$$;

revoke all on function public.admin_ai_usage_today() from public, anon, authenticated;
grant execute on function public.admin_ai_usage_today() to authenticated;
