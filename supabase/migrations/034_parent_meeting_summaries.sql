create table if not exists public.parent_meeting_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  notes text not null,
  subjects_discussed jsonb not null default '[]'::jsonb,
  agreements_reached jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists parent_meeting_summaries_user_student_idx
  on public.parent_meeting_summaries(user_id, student_id);

alter table public.parent_meeting_summaries enable row level security;

drop policy if exists "parent_meeting_summaries_select_own" on public.parent_meeting_summaries;
drop policy if exists "parent_meeting_summaries_insert_own" on public.parent_meeting_summaries;
drop policy if exists "parent_meeting_summaries_update_own" on public.parent_meeting_summaries;
drop policy if exists "parent_meeting_summaries_delete_own" on public.parent_meeting_summaries;

create policy "parent_meeting_summaries_select_own"
  on public.parent_meeting_summaries
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = parent_meeting_summaries.student_id
        and student_profiles.user_id = auth.uid()
    )
  );

create policy "parent_meeting_summaries_insert_own"
  on public.parent_meeting_summaries
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = parent_meeting_summaries.student_id
        and student_profiles.user_id = auth.uid()
    )
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = parent_meeting_summaries.class_id
          and classes.user_id = auth.uid()
      )
    )
  );

create policy "parent_meeting_summaries_update_own"
  on public.parent_meeting_summaries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "parent_meeting_summaries_delete_own"
  on public.parent_meeting_summaries
  for delete
  using (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
