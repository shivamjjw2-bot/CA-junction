-- Add chapter metadata for student-contributed notes and publish it with each note.
alter table public.materials add column if not exists chapter text not null default '';
alter table public.student_note_submissions add column if not exists chapter text not null default '';

create or replace function public.publish_student_note_immediately()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  if new.status <> 'pending' then raise exception 'Student notes must be submitted as pending.'; end if;
  insert into public.materials(
    title,description,level,subject,chapter,category,file_bucket,file_path,
    is_premium,is_published,submitted_by,contributor_name,linkedin_url,instagram_handle,
    student_submission_id,created_by
  ) values(
    new.title,new.description,new.level,new.subject,new.chapter,'student_note','student-notes',new.file_path,
    false,true,new.user_id,new.contributor_name,new.linkedin_url,new.instagram_handle,new.id,new.user_id
  );
  update public.student_note_submissions set status='approved', reviewed_at=now() where id=new.id;
  return new;
end $fn$;
