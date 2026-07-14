create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  count int not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, period),
  check (period ~ '^[0-9]{4}-[0-9]{2}$')
);

alter table public.usage_counters enable row level security;

drop policy if exists "usage_counters_select_own" on public.usage_counters;
create policy "usage_counters_select_own"
  on public.usage_counters
  for select
  using (auth.uid() = user_id);

create or replace function public.increment_usage(p_user_id uuid, p_limit int)
returns int
language sql
security definer
set search_path = public
as $$
  with upserted as (
    insert into public.usage_counters (user_id, period, count, updated_at)
    select p_user_id, to_char(now(), 'YYYY-MM'), 1, now()
    where p_limit > 0
      and p_user_id = auth.uid()
    on conflict (user_id, period) do update
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

create or replace function public.decrement_usage(p_user_id uuid)
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
    returning count
  )
  select coalesce((select count from updated), 0);
$$;
