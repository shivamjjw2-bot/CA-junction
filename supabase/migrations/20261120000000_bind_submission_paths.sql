begin;
drop policy if exists "student submits own notes" on public.student_note_submissions;
create policy "student submits own notes" on public.student_note_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending' and (storage.foldername(file_path))[1]=auth.uid()::text);
drop policy if exists "script owner insert" on public.evaluation_submissions;
create policy "script owner insert" on public.evaluation_submissions for insert to authenticated with check (user_id=auth.uid() and status='pending' and (storage.foldername(file_path))[1]=auth.uid()::text and reviewer_id is null and reviewed_at is null and score is null and feedback='');
commit;
