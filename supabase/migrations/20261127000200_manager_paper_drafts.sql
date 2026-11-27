create table ca_access.managers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default true,
 permissions text[] not null default '{}',
 check(permissions <@ array['PYQ','MTP','RTP']::text[])
);
create table ca_access.manager_events (
 id bigint generated always as identity primary key, created_at timestamptz not null default now(),
 actor uuid not null, target_id uuid not null, action text not null, details jsonb not null default '{}'
);
revoke all on ca_access.managers, ca_access.manager_events from public,anon,authenticated;
alter table ca_access.managers enable row level security;
alter table ca_access.manager_events enable row level security;

create function public.ca_team_manage(action text, email text default null, modules text[] default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid; result jsonb;
begin
 if not public.is_platform_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 if action='list' then
   select coalesce(jsonb_agg(jsonb_build_object('email',u.email,'active',m.active,'modules',m.permissions) order by u.email),'[]') into result from ca_access.managers m join auth.users u on u.id=m.user_id;
   return result;
 elsif action='history' then
   select coalesce(jsonb_agg(to_jsonb(v) order by v.id desc),'[]') into result from (
   select e.id,e.created_at,u.email as manager,e.action,e.details from ca_access.manager_events e left join auth.users u on u.id=e.target_id order by e.id desc limit 100) v; return result;
 end if;
 if action is null or action not in ('save','suspend','reactivate','remove') then raise exception 'Unknown action'; end if;
 select u.id into strict target from auth.users u where lower(u.email)=lower(trim(ca_team_manage.email)) and u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google' and lower(i.identity_data->>'email')=lower(u.email) and i.identity_data->>'email_verified'='true');
 if exists(select 1 from public.user_roles r where r.user_id=target and r.role='admin') then raise exception 'Choose a non-administrator account'; end if;
 if action='save' then
   if modules is null or array_position(modules,null) is not null or not (modules <@ array['PYQ','MTP','RTP']::text[]) then raise exception 'Invalid collection'; end if;
   insert into ca_access.managers(user_id,permissions) values(target,modules) on conflict(user_id) do update set permissions=excluded.permissions;
 elsif action='remove' then delete from ca_access.managers m where m.user_id=target;
 else update ca_access.managers m set active=(action='reactivate') where m.user_id=target;
 end if;
 if not found then raise exception 'Manager not found'; end if;
 insert into ca_access.manager_events(actor,target_id,action,details) values(auth.uid(),target,action,case when action='save' then jsonb_build_object('collections',modules) else '{}'::jsonb end);
 return to_jsonb('Saved'::text);
exception when no_data_found then raise exception 'Ask the manager to sign in with Google first.';
end $$;

create function public.ca_manager_collections() returns text[] language sql stable security definer set search_path='' as $$
 select coalesce((select m.permissions from ca_access.managers m where m.user_id=auth.uid() and m.active and
 (auth.jwt()->>'aal'='aal2' or not exists(select 1 from auth.mfa_factors f where f.user_id=m.user_id and f.status='verified'))),'{}'::text[])
$$;
create function public.ca_manager_add_paper(collection text, level_name text, subject_name text, exam_year int, exam_month text, kind text, pdf_url text) returns uuid
language plpgsql security definer set search_path='' as $$
declare item uuid; series text; suffix text;
begin
 perform 1 from ca_access.managers m where m.user_id=auth.uid() for share;
 if collection is null or not(collection=any(public.ca_manager_collections())) then raise exception 'Permission required' using errcode='42501'; end if;
 if level_name is null or level_name not in ('Foundation','Intermediate','Final') or exam_year is null or exam_year not between 1990 and extract(year from current_date)::int+1 or exam_month is null or exam_month not in ('January','May','June','September','November','December') or kind is null or kind not in ('question','solution') or length(trim(coalesce(subject_name,''))) not between 1 and 140 then raise exception 'Invalid paper details'; end if;
 if pdf_url is null or length(pdf_url)>2000 or pdf_url !~ '^https://(resource\.cdn\.icai\.org/|cdn\.shopify\.com/s/files/1/0023/3200/0311/files/)[^[:space:]]+\.pdf([?][^[:space:]]*)?$' then raise exception 'Use an ICAI or approved archive PDF link'; end if;
 series=case collection when 'PYQ' then 'previous_year' when 'MTP' then 'mtp' else 'rtp' end;
 suffix=case when kind='solution' and collection<>'PYQ' then 'suggested_answer' else kind end;
 insert into public.materials(title,description,subject,chapter,external_url,level,category,is_published,is_premium)
 values(concat_ws(' · ',level_name,trim(subject_name),exam_month||' '||exam_year,kind),'CAJ_PAPER_V1|'||jsonb_build_object('version',1,'scheme','Current','year',exam_year,'attempt',exam_month)::text,trim(subject_name),series||'_'||suffix,pdf_url,level_name,'icai_link',false,false) returning id into item;
 insert into ca_access.manager_events(actor,target_id,action,details) values(auth.uid(),auth.uid(),'add draft',jsonb_build_object('material',item,'collection',collection));
 return item;
end $$;
revoke all on function public.ca_manager_collections(),public.ca_team_manage(text,text,text[]),public.ca_manager_add_paper(text,text,text,int,text,text,text) from public,anon;
grant execute on function public.ca_manager_collections(),public.ca_team_manage(text,text,text[]),public.ca_manager_add_paper(text,text,text,int,text,text,text) to authenticated;