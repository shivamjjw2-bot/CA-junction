-- Make each valid student note visible immediately after upload.
-- Run this once in the Supabase SQL editor for an existing project.

alter table public.materials add column if not exists contributor_name text not null default '';
alter table public.materials add column if not exists linkedin_url text not null default '';
alter table public.materials add column if not exists instagram_handle text not null default '';

alter table public.student_note_submissions add column if not exists contributor_name text not null default '';
alter table public.student_note_submissions add column if not exists linkedin_url text not null default '';
alter table public.student_note_submissions add column if not exists instagram_handle text not null default '';

create or replace function public.publish_student_note_immediately()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status <> 'pending' then
    raise exception 'Student notes must be submitted as pending.';
  end if;

  insert into public.materials(
    title,description,level,subject,category,file_bucket,file_path,
    is_premium,is_published,submitted_by,contributor_name,linkedin_url,instagram_handle,created_by
  ) values (
    new.title,new.description,new.level,new.subject,'student_note','student-notes',new.file_path,
    false,true,new.user_id,new.contributor_name,new.linkedin_url,new.instagram_handle,new.user_id
  );

  update public.student_note_submissions
  set status='approved', reviewed_at=now()
  where id=new.id;

  return new;
end $$;

drop trigger if exists publish_student_note_after_upload on public.student_note_submissions;
create trigger publish_student_note_after_upload
after insert on public.student_note_submissions
for each row execute procedure public.publish_student_note_immediately();

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
