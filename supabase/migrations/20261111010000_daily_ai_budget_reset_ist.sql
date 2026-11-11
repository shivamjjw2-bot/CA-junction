-- Use the India calendar day for CA Junction's shared daily AI allowance.
-- The counter rolls over on the first request after midnight Asia/Kolkata; no scheduled job is required.
create or replace function public.reserve_ca_ai_neurons(p_neurons integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved_total integer;
  today_ist date := timezone('Asia/Kolkata', now())::date;
begin
  if auth.uid() is null or p_neurons is null or p_neurons not in (1500, 2000) then
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

  return found;
end;
$$;

revoke all on function public.reserve_ca_ai_neurons(integer) from public, anon, authenticated;
grant execute on function public.reserve_ca_ai_neurons(integer) to authenticated;
