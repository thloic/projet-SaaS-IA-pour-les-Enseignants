create table if not exists public.ambassador_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists ambassador_codes_code_idx on public.ambassador_codes(code);

alter table public.ambassador_codes enable row level security;

drop policy if exists "ambassador_codes_select_own" on public.ambassador_codes;
create policy "ambassador_codes_select_own"
on public.ambassador_codes for select
using (auth.uid() = user_id);

-- Contrairement à `subscriptions`, un enseignant peut créer SON PROPRE code :
-- c'est un simple identifiant sans valeur monétaire en soi (la valeur vient des
-- redemptions ci-dessous, qui elles ne sont jamais écrites par l'utilisateur).
drop policy if exists "ambassador_codes_insert_own" on public.ambassador_codes;
create policy "ambassador_codes_insert_own"
on public.ambassador_codes for insert
with check (auth.uid() = user_id);

create table if not exists public.ambassador_redemptions (
  id uuid primary key default gen_random_uuid(),
  ambassador_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- L'unicité sur referred_user_id garantit qu'un même filleul ne peut jamais être
-- compté deux fois, pour aucun ambassadeur, même après résiliation/réabonnement.
create index if not exists ambassador_redemptions_ambassador_user_id_idx on public.ambassador_redemptions(ambassador_user_id);

alter table public.ambassador_redemptions enable row level security;

-- Lecture seule pour l'ambassadeur concerné. Aucune policy insert/update/delete :
-- un filleul ne doit jamais pouvoir s'attribuer lui-même une réduction à un
-- ambassadeur ; seul le webhook Stripe (service_role), après paiement confirmé,
-- écrit ici — même logique que `subscriptions`.
drop policy if exists "ambassador_redemptions_select_own" on public.ambassador_redemptions;
create policy "ambassador_redemptions_select_own"
on public.ambassador_redemptions for select
using (auth.uid() = ambassador_user_id);

notify pgrst, 'reload schema';
