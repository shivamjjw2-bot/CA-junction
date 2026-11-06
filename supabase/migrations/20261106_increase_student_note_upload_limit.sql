-- Current Supabase Free projects allow files up to 50 MB globally.
-- Raise the student-notes bucket from 10 MB to the available project maximum.
update storage.buckets
set file_size_limit = 52428800
where id = 'student-notes';
