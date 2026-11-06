-- Publish student notes after each successful upload and let the owner remove their own note.
-- Apply this migration once in the Supabase SQL editor for an existing project.

alter table public.materials add column if not exists contributor_name text not null default '';
alter table public.materials add column if not exists linkedin_url text not null default '';
alter table public.materials add column if not exists instagram_handle text not null default '';

alter table public.student_note_submissions add column if not exists contributor_name text not null default '';
alter table public.student_note_submissions add column if not exists linkedin_url text not null default '';
alter table public.student_note_submissions add column if not exists instagram_handle text not null default '';

alter table public.materials add column if not exists student_submission_id uuid references public.student_note_submissions(id) on delete cascade;
create unique index if not exists materials_student_submission_unique on public.materials(student_submission_id) where student_submission_id is not null;

create or replace function public.publish_student_note_immediately()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if new.status <> 'pending' then
    raise exception 'Student notes must be submitted as pending.';
  end if;

  insert into public.materials(
    title,description,level,subject,category,file_bucket,file_path,
    is_premium,is_published,submitted_by,contributor_name,linkedin_url,instagram_handle,
    student_submission_id,created_by
  ) values (
    new.title,new.description,new.level,new.subject,'student_note','student-notes',new.file_path,
    false,true,new.user_id,new.contributor_name,new.linkedin_url,new.instagram_handle,
    new.id,new.user_id
  );

  update public.student_note_submissions
  set status='approved', reviewed_at=now()
  where id=new.id;

  return new;
end $fn$;

drop trigger if exists publish_student_note_after_upload on public.student_note_submissions;
create trigger publish_student_note_after_upload
after insert on public.student_note_submissions
for each row execute procedure public.publish_student_note_immediately();

create or replace function public.remove_own_student_note(target_submission uuid)
returns text language plpgsql security definer set search_path = public
as $fn$
declare
  note_owner uuid;
  note_path text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to remove your note.';
  end if;

  select user_id,file_path into note_owner,note_path
  from public.student_note_submissions
  where id=target_submission
  for update;

  if not found or note_owner <> auth.uid() then
    raise exception 'You can remove only notes you contributed.';
  end if;

  delete from public.student_note_submissions
  where id=target_submission and user_id=auth.uid();

  return note_path;
end $fn$;

grant execute on function public.remove_own_student_note(uuid) to authenticated;

drop policy if exists "student or admin reads note uploads" on storage.objects;
create policy "student or admin reads note uploads" on storage.objects for select to authenticated using (
  bucket_id='student-notes' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_admin()
    or exists(
      select 1 from public.materials m
      where m.file_bucket='student-notes' and m.file_path=name
        and m.category='student_note' and m.is_published
    )
  )
);

drop policy if exists "student deletes own note upload" on storage.objects;
create policy "student deletes own note upload" on storage.objects for delete to authenticated using (
  bucket_id='student-notes' and (storage.foldername(name))[1]=auth.uid()::text
);
