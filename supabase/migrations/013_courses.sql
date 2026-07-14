create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  level text not null,
  duration_minutes int not null,
  objectives text,
  content_md text not null default '',
  status text not null default 'generating' check (status in ('generating', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

drop policy if exists "courses_select_own" on public.courses;
create policy "courses_select_own"
  on public.courses
  for select
  using (auth.uid() = user_id);

drop policy if exists "courses_insert_own" on public.courses;
create policy "courses_insert_own"
  on public.courses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "courses_update_own" on public.courses;
create policy "courses_update_own"
  on public.courses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "courses_delete_own" on public.courses;
create policy "courses_delete_own"
  on public.courses
  for delete
  using (auth.uid() = user_id);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();
