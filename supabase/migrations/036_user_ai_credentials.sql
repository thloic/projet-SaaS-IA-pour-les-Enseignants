create table if not exists public.user_ai_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'anthropic' check (provider = 'anthropic'),
  encrypted_secret text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  encryption_version integer not null default 1 check (encryption_version > 0),
  key_suffix text not null check (char_length(key_suffix) between 2 and 8),
  is_active boolean not null default true,
  status text not null default 'valid' check (status in ('valid', 'invalid', 'revoked')),
  validated_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_credentials enable row level security;

drop policy if exists "user_ai_credentials_select_own" on public.user_ai_credentials;
drop policy if exists "user_ai_credentials_insert_own" on public.user_ai_credentials;
drop policy if exists "user_ai_credentials_update_own" on public.user_ai_credentials;
drop policy if exists "user_ai_credentials_delete_own" on public.user_ai_credentials;

create policy "user_ai_credentials_select_own"
  on public.user_ai_credentials for select
  using (auth.uid() = user_id);

create policy "user_ai_credentials_insert_own"
  on public.user_ai_credentials for insert
  with check (auth.uid() = user_id);

create policy "user_ai_credentials_update_own"
  on public.user_ai_credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_ai_credentials_delete_own"
  on public.user_ai_credentials for delete
  using (auth.uid() = user_id);

drop trigger if exists user_ai_credentials_set_updated_at on public.user_ai_credentials;
create trigger user_ai_credentials_set_updated_at
  before update on public.user_ai_credentials
  for each row execute function public.set_updated_at();

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  provider text not null default 'anthropic',
  credential_source text not null check (credential_source in ('included', 'personal')),
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cache_creation_tokens integer not null default 0 check (cache_creation_tokens >= 0),
  cache_read_tokens integer not null default 0 check (cache_read_tokens >= 0),
  estimated_cost_microusd bigint not null default 0 check (estimated_cost_microusd >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  status text not null check (status in ('success', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events(user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
drop policy if exists "ai_usage_events_insert_own" on public.ai_usage_events;

create policy "ai_usage_events_select_own"
  on public.ai_usage_events for select
  using (auth.uid() = user_id);

create policy "ai_usage_events_insert_own"
  on public.ai_usage_events for insert
  with check (auth.uid() = user_id);
