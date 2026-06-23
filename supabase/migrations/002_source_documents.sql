create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_text text not null,
  source_type text not null default 'text' check (source_type in ('text', 'file')),
  original_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_documents enable row level security;

create policy "source_documents_select_own"
  on public.source_documents
  for select
  using (auth.uid() = user_id);

create policy "source_documents_insert_own"
  on public.source_documents
  for insert
  with check (auth.uid() = user_id);

create policy "source_documents_update_own"
  on public.source_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "source_documents_delete_own"
  on public.source_documents
  for delete
  using (auth.uid() = user_id);

-- Réutilise la fonction déjà créée par 001_teacher_profiles.sql
drop trigger if exists source_documents_set_updated_at on public.source_documents;

create trigger source_documents_set_updated_at
  before update on public.source_documents
  for each row
  execute function public.set_updated_at();
