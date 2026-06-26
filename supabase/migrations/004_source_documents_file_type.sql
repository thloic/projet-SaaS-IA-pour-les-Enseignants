alter table public.source_documents
  add column if not exists file_type text check (file_type in ('txt', 'pdf', 'docx'));
