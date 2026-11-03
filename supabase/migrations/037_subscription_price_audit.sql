alter table public.subscriptions
  add column if not exists stripe_price_id text;

create index if not exists subscriptions_stripe_price_id_idx
  on public.subscriptions(stripe_price_id);

comment on column public.subscriptions.stripe_price_id is
  'Price Stripe réellement confirmé par le webhook; ne provient jamais du navigateur.';

notify pgrst, 'reload schema';
