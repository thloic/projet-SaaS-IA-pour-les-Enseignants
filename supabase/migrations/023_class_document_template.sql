alter table public.classes
  add column if not exists document_template text;

notify pgrst, 'reload schema';
