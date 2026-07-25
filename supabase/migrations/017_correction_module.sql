create table if not exists public.correction_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'generating', 'partial', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correction_copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.correction_batches(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  content_text text not null,
  findings jsonb not null default '[]' check (jsonb_typeof(findings) = 'array'),
  comment text,
  status text not null default 'pending' check (status in ('pending', 'generating', 'complete', 'failed', 'validated')),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, student_id)
);

create index if not exists correction_copies_batch_idx on public.correction_copies(batch_id);

alter table public.correction_batches enable row level security;
alter table public.correction_copies enable row level security;

drop policy if exists "correction_batches_select_own" on public.correction_batches;
create policy "correction_batches_select_own"
  on public.correction_batches
  for select
  using (auth.uid() = user_id);

drop policy if exists "correction_batches_insert_own" on public.correction_batches;
create policy "correction_batches_insert_own"
  on public.correction_batches
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "correction_batches_update_own" on public.correction_batches;
create policy "correction_batches_update_own"
  on public.correction_batches
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "correction_batches_delete_own" on public.correction_batches;
create policy "correction_batches_delete_own"
  on public.correction_batches
  for delete
  using (auth.uid() = user_id);

drop policy if exists "correction_copies_select_own" on public.correction_copies;
create policy "correction_copies_select_own"
  on public.correction_copies
  for select
  using (auth.uid() = user_id);

drop policy if exists "correction_copies_insert_own" on public.correction_copies;
create policy "correction_copies_insert_own"
  on public.correction_copies
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "correction_copies_update_own" on public.correction_copies;
create policy "correction_copies_update_own"
  on public.correction_copies
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "correction_copies_delete_own" on public.correction_copies;
create policy "correction_copies_delete_own"
  on public.correction_copies
  for delete
  using (auth.uid() = user_id);

drop trigger if exists correction_batches_set_updated_at on public.correction_batches;
create trigger correction_batches_set_updated_at
  before update on public.correction_batches
  for each row
  execute function public.set_updated_at();

drop trigger if exists correction_copies_set_updated_at on public.correction_copies;
create trigger correction_copies_set_updated_at
  before update on public.correction_copies
  for each row
  execute function public.set_updated_at();

select pg_notify('pgrst', 'reload schema');
