begin;
drop policy if exists "create service requests" on public.service_requests;
create policy "create service requests" on public.service_requests for insert to authenticated with check (user_id=auth.uid() and status='new' and admin_note='' and length(trim(message)) between 1 and 2000);
create index if not exists service_requests_owner_time on public.service_requests(user_id,created_at desc);
create or replace function public.validate_enquiry_interval()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := statement_timestamp();
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (select 1 from public.service_requests where user_id=new.user_id
    and created_at > new.created_at - interval '15 seconds') then
    raise exception 'Please wait 15 seconds before sending another enquiry.';
  end if;
  return new;
end;
$$;
drop trigger if exists check_enquiry_interval on public.service_requests;
create trigger check_enquiry_interval before insert on public.service_requests
for each row execute function public.validate_enquiry_interval();
commit;
