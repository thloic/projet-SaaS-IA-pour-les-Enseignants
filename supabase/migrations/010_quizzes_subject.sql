alter table public.quizzes
  add column if not exists subject text not null default 'Matiere non precisee';

select pg_notify('pgrst', 'reload schema');
