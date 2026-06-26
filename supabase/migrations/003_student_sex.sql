alter table public.student_profiles
  add column if not exists sex text not null default 'M' check (sex in ('M', 'F'));
