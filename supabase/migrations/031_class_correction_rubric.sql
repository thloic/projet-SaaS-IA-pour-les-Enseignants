alter table public.classes
  add column if not exists correction_rubric text;

notify pgrst, 'reload schema';
