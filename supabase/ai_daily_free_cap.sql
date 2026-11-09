-- Run in Supabase SQL Editor for the existing CA Junction project.
-- The app reserves a conservative estimate before each inference and fails closed.
-- CA Junction's combined daily reservation ceiling is 8,000 Neurons, leaving
-- a 2,000-Neuron buffer below Cloudflare's 10,000 daily free allocation.
create table if not exists public.ca_ai_daily_usage (
  usage_day date primary key,
  estimated_neurons integer not null default 0
);
alter table public.ca_ai_daily_usage
  add column if not exists estimated_neurons integer not null default 0;
alter table public.ca_ai_daily_usage enable row level security;
revoke all on public.ca_ai_daily_usage from anon, authenticated;

drop function if exists public.reserve_ca_ai_generation();

create or replace function public.reserve_ca_ai_neurons(p_neurons integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_total integer;
begin
  if auth.uid() is null or p_neurons not in (1500, 2000) then
    return false;
  end if;

  delete from public.ca_ai_daily_usage
  where usage_day < (timezone('utc', now())::date);

  insert into public.ca_ai_daily_usage as current_usage (usage_day, estimated_neurons)
  values (timezone('utc', now())::date, p_neurons)
  on conflict (usage_day) do update
    set estimated_neurons = current_usage.estimated_neurons + p_neurons
    where current_usage.estimated_neurons + p_neurons <= 8000
  returning estimated_neurons into reserved_total;

  return found;
end;
$$;

revoke all on function public.reserve_ca_ai_neurons(integer) from public, anon, authenticated;
grant execute on function public.reserve_ca_ai_neurons(integer) to authenticated;
