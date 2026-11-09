-- Raise CA Junction's shared daily AI neuron limit from 8,000 to 9,000.
-- Apply this migration in the linked Supabase project's SQL Editor.
create or replace function public.reserve_ca_ai_neurons(p_neurons integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_total integer;
begin
  if auth.uid() is null or p_neurons is null or p_neurons not in (1500, 2000) then
    return false;
  end if;

  delete from public.ca_ai_daily_usage
  where usage_day < (timezone('utc', now())::date);

  insert into public.ca_ai_daily_usage as current_usage (usage_day, estimated_neurons)
  values (timezone('utc', now())::date, p_neurons)
  on conflict (usage_day) do update
    set estimated_neurons = current_usage.estimated_neurons + p_neurons
    where current_usage.estimated_neurons + p_neurons <= 9000
  returning estimated_neurons into reserved_total;

  return found;
end;
$$;

revoke all on function public.reserve_ca_ai_neurons(integer) from public, anon, authenticated;
grant execute on function public.reserve_ca_ai_neurons(integer) to authenticated;
