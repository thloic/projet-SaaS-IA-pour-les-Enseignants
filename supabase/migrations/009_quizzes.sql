create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_document_id uuid references public.source_documents(id) on delete set null,
  title text not null,
  subject text not null default 'Matiere non precisee',
  source_text_snapshot text not null,
  grading_system text not null check (
    grading_system in ('20', '10', 'letter', 'percentage', 'letter_ca', 'levels')
  ),
  total_points numeric not null check (total_points > 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;

drop policy if exists "quizzes_select_own" on public.quizzes;
create policy "quizzes_select_own"
  on public.quizzes
  for select
  using (auth.uid() = user_id);

drop policy if exists "quizzes_insert_own" on public.quizzes;
create policy "quizzes_insert_own"
  on public.quizzes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "quizzes_update_own" on public.quizzes;
create policy "quizzes_update_own"
  on public.quizzes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quizzes_delete_own" on public.quizzes;
create policy "quizzes_delete_own"
  on public.quizzes
  for delete
  using (auth.uid() = user_id);

drop trigger if exists quizzes_set_updated_at on public.quizzes;

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row
  execute function public.set_updated_at();

select pg_notify('pgrst', 'reload schema');
