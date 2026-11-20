revoke insert, update, delete, truncate, references, trigger on public.published_test_questions from public, anon, authenticated;
alter view public.published_test_questions set (security_barrier=true);
