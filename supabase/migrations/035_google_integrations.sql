create table if not exists public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  scopes text[] not null default '{}',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_integrations enable row level security;

drop policy if exists "google_integrations_select_own" on public.google_integrations;
drop policy if exists "google_integrations_insert_own" on public.google_integrations;
drop policy if exists "google_integrations_update_own" on public.google_integrations;
drop policy if exists "google_integrations_delete_own" on public.google_integrations;

create policy "google_integrations_select_own"
  on public.google_integrations
  for select
  using (auth.uid() = user_id);

create policy "google_integrations_insert_own"
  on public.google_integrations
  for insert
  with check (auth.uid() = user_id);

create policy "google_integrations_update_own"
  on public.google_integrations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "google_integrations_delete_own"
  on public.google_integrations
  for delete
  using (auth.uid() = user_id);

create trigger google_integrations_set_updated_at
  before update on public.google_integrations
  for each row execute function public.set_updated_at();

-- Suivi d'envoi reel sur un brouillon de courriel parent deja existant : un
-- brouillon reste un brouillon jusqu'a cet envoi explicite, jamais automatique.
alter table public.parent_email_drafts
  add column if not exists sent_at timestamptz,
  add column if not exists sent_to text;

select pg_notify('pgrst', 'reload schema');
