alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_grading_system_check;

alter table public.teacher_profiles
  add constraint teacher_profiles_grading_system_check
  check (grading_system in ('20','10','letter','percentage','letter_ca','levels'));

select pg_notify('pgrst', 'reload schema');
