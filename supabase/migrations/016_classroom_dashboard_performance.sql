create index if not exists class_sessions_class_date_idx
  on public.class_sessions(class_id, session_date desc);

create index if not exists class_sessions_user_date_idx
  on public.class_sessions(user_id, session_date desc);

create index if not exists attendance_records_session_student_idx
  on public.attendance_records(session_id, student_id);

create index if not exists attendance_records_student_session_idx
  on public.attendance_records(student_id, session_id);

create index if not exists participation_events_session_student_idx
  on public.participation_events(session_id, student_id);

create index if not exists participation_events_student_created_idx
  on public.participation_events(student_id, created_at desc);

create index if not exists student_observations_session_student_idx
  on public.student_observations(session_id, student_id);

create index if not exists student_observations_student_created_idx
  on public.student_observations(student_id, created_at desc);
