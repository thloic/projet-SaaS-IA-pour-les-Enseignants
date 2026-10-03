create table if not exists public.parent_email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  register text not null check (register in ('comportement', 'echec', 'plagiat', 'autre')),
  situation text,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists parent_email_drafts_user_student_idx
  on public.parent_email_drafts(user_id, student_id);

alter table public.parent_email_drafts enable row level security;

drop policy if exists "parent_email_drafts_select_own" on public.parent_email_drafts;
drop policy if exists "parent_email_drafts_insert_own" on public.parent_email_drafts;
drop policy if exists "parent_email_drafts_update_own" on public.parent_email_drafts;
drop policy if exists "parent_email_drafts_delete_own" on public.parent_email_drafts;

create policy "parent_email_drafts_select_own"
  on public.parent_email_drafts
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = parent_email_drafts.student_id
        and student_profiles.user_id = auth.uid()
    )
  );

create policy "parent_email_drafts_insert_own"
  on public.parent_email_drafts
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = parent_email_drafts.student_id
        and student_profiles.user_id = auth.uid()
    )
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = parent_email_drafts.class_id
          and classes.user_id = auth.uid()
      )
    )
  );

create policy "parent_email_drafts_update_own"
  on public.parent_email_drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "parent_email_drafts_delete_own"
  on public.parent_email_drafts
  for delete
  using (auth.uid() = user_id);

select pg_notify('pgrst', 'reload schema');
