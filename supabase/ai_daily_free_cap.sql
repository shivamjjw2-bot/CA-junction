-- Run once in the Supabase SQL Editor for the existing CA Junction project.
-- All CA Junction AI MCQ and AI planner generations share this four-per-day cap.
create table if not exists public.ca_ai_daily_usage (
  usage_day date primary key,
  request_count integer not null default 0 check (request_count >= 0)
);
alter table public.ca_ai_daily_usage enable row level security;
revoke all on public.ca_ai_daily_usage from anon, authenticated;

create or replace function public.reserve_ca_ai_generation()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_count integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  delete from public.ca_ai_daily_usage
  where usage_day < (timezone('utc', now())::date);

  insert into public.ca_ai_daily_usage as current_usage (usage_day, request_count)
  values (timezone('utc', now())::date, 1)
  on conflict (usage_day) do update
    set request_count = current_usage.request_count + 1
    where current_usage.request_count < 4
  returning request_count into reserved_count;

  return found;
end;
$$;

revoke all on function public.reserve_ca_ai_generation() from public, anon, authenticated;
grant execute on function public.reserve_ca_ai_generation() to authenticated;
