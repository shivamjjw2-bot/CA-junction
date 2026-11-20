begin;
drop policy if exists "student submits own notes" on public.student_note_submissions;
create policy "student submits own notes" on public.student_note_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null and admin_note='' and (storage.foldername(file_path))[1]=auth.uid()::text);
drop policy if exists "script owner insert" on public.evaluation_submissions;
create policy "script owner insert" on public.evaluation_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending' and (storage.foldername(file_path))[1]=auth.uid()::text and reviewer_id is null and reviewed_at is null and score is null and feedback='');
drop policy if exists "student or admin reads note uploads" on storage.objects;
create policy "student or admin reads note uploads" on storage.objects for select to authenticated using (
  bucket_id='student-notes' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_admin()
    or exists(
      select 1 from public.materials m
      where m.file_bucket='student-notes' and m.file_path=name and m.submitted_by::text=(storage.foldername(name))[1]
        and m.category='student_note' and m.is_published
    )
  )
);
commit;
