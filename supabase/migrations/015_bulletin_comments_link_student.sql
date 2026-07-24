alter table public.bulletin_comments
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists student_id uuid references public.student_profiles(id) on delete set null;

select pg_notify('pgrst', 'reload schema');
