alter table public.student_profiles
  add column if not exists institutional_adaptations text[] not null default '{}';
