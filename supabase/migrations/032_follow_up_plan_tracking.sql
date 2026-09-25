create table if not exists public.follow_up_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  statut text not null default 'actif' check (statut in ('actif', 'termine')),
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- plan : { eleve: { nom }, statut, items: [{ sourceId, source, constat, objectif,
--   indicateur, echeance, prochaineEtape, status: 'a_suivre'|'atteint'|'non_atteint',
--   revisionNote? }], bilan? } — la colonne statut duplique plan.statut uniquement
-- pour permettre le filtre indexe "plan actif d'un eleve" sans depaqueter le jsonb.

create index if not exists follow_up_plans_user_student_idx
  on public.follow_up_plans(user_id, student_id);
create index if not exists follow_up_plans_user_student_active_idx
  on public.follow_up_plans(user_id, student_id)
  where statut = 'actif';

alter table public.follow_up_plans enable row level security;

drop policy if exists "follow_up_plans_select_own" on public.follow_up_plans;
drop policy if exists "follow_up_plans_insert_own" on public.follow_up_plans;
drop policy if exists "follow_up_plans_update_own" on public.follow_up_plans;
drop policy if exists "follow_up_plans_delete_own" on public.follow_up_plans;

create policy "follow_up_plans_select_own"
  on public.follow_up_plans
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = follow_up_plans.student_id
        and student_profiles.user_id = auth.uid()
    )
  );

create policy "follow_up_plans_insert_own"
  on public.follow_up_plans
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = follow_up_plans.student_id
        and student_profiles.user_id = auth.uid()
    )
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = follow_up_plans.class_id
          and classes.user_id = auth.uid()
      )
    )
  );

create policy "follow_up_plans_update_own"
  on public.follow_up_plans
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = follow_up_plans.student_id
        and student_profiles.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = follow_up_plans.student_id
        and student_profiles.user_id = auth.uid()
    )
  );

create policy "follow_up_plans_delete_own"
  on public.follow_up_plans
  for delete
  using (auth.uid() = user_id);

create trigger follow_up_plans_set_updated_at
  before update on public.follow_up_plans
  for each row execute function public.set_updated_at();

select pg_notify('pgrst', 'reload schema');
