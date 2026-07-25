-- Ton de correction, fixe une fois pour tout le lot au moment du lancement
-- (distinct du ton du bulletin : encourageant / factuel / direct, fiche 15).
alter table public.correction_batches
  add column if not exists tone text check (tone in ('encourageant', 'factuel', 'direct'));

-- Quota freemium dedie par fonctionnalite plutot qu'un compteur global partage :
-- une correction de classe entiere (jusqu'a 30 copies) epuiserait instantanement
-- le compteur partage entre cours/quiz/bulletin/adaptation.
alter table public.usage_counters
  add column if not exists feature text not null default 'general';

alter table public.usage_counters
  drop constraint if exists usage_counters_user_id_period_key;

alter table public.usage_counters
  drop constraint if exists usage_counters_user_id_period_feature_key;

alter table public.usage_counters
  add constraint usage_counters_user_id_period_feature_key unique (user_id, period, feature);

create or replace function public.increment_usage(p_user_id uuid, p_limit int, p_feature text default 'general')
returns int
language sql
security definer
set search_path = public
as $$
  with upserted as (
    insert into public.usage_counters (user_id, period, feature, count, updated_at)
    select p_user_id, to_char(now(), 'YYYY-MM'), p_feature, 1, now()
    where p_limit > 0
      and p_user_id = auth.uid()
    on conflict (user_id, period, feature) do update
      set
        count = public.usage_counters.count + 1,
        updated_at = now()
      where public.usage_counters.count < p_limit
        and public.usage_counters.user_id = auth.uid()
    returning count
  )
  select
    case
      when p_limit < 1 then -1
      else coalesce((select count from upserted), -1)
    end;
$$;

create or replace function public.decrement_usage(p_user_id uuid, p_feature text default 'general')
returns int
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.usage_counters
    set
      count = greatest(count - 1, 0),
      updated_at = now()
    where user_id = p_user_id
      and p_user_id = auth.uid()
      and period = to_char(now(), 'YYYY-MM')
      and feature = p_feature
    returning count
  )
  select coalesce((select count from updated), 0);
$$;

select pg_notify('pgrst', 'reload schema');
