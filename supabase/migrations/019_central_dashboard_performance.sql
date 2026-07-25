create index if not exists courses_user_created_idx
  on public.courses(user_id, created_at desc);

create index if not exists quizzes_user_created_idx
  on public.quizzes(user_id, created_at desc);

create index if not exists bulletin_comments_user_created_idx
  on public.bulletin_comments(user_id, created_at desc);

create index if not exists source_documents_user_created_idx
  on public.source_documents(user_id, created_at desc);

create index if not exists correction_batches_user_created_idx
  on public.correction_batches(user_id, created_at desc);

create index if not exists participation_events_user_session_idx
  on public.participation_events(user_id, session_id);

create index if not exists student_observations_user_session_idx
  on public.student_observations(user_id, session_id);
