create table if not exists public.bulletin_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  subject text not null,
  grade text not null,
  observations text,
  tone text not null check (tone in ('bienveillant', 'encourageant', 'factuel')),
  comment text not null,
  created_at timestamptz not null default now()
);

alter table public.bulletin_comments enable row level security;

drop policy if exists "bulletin_comments_select_own" on public.bulletin_comments;
create policy "bulletin_comments_select_own"
  on public.bulletin_comments
  for select
  using (auth.uid() = user_id);

drop policy if exists "bulletin_comments_insert_own" on public.bulletin_comments;
create policy "bulletin_comments_insert_own"
  on public.bulletin_comments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "bulletin_comments_update_own" on public.bulletin_comments;
create policy "bulletin_comments_update_own"
  on public.bulletin_comments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bulletin_comments_delete_own" on public.bulletin_comments;
create policy "bulletin_comments_delete_own"
  on public.bulletin_comments
  for delete
  using (auth.uid() = user_id);
