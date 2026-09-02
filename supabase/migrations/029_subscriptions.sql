create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused')),
  price_interval text check (price_interval in ('month', 'year')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Lecture seule pour l'utilisateur concerné. Aucune policy insert/update/delete :
-- seul un client service_role (qui contourne RLS) peut écrire ici, depuis le webhook.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- RLS activé, aucune policy : ni les utilisateurs anonymes ni les utilisateurs
-- authentifiés n'ont accès à cette table, dans aucun sens. Seul service_role l'utilise.
alter table public.stripe_webhook_events enable row level security;

notify pgrst, 'reload schema';
