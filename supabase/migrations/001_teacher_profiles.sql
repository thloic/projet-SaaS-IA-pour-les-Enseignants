create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  country text not null,
  subject text not null,
  levels text[] not null default '{}',
  grading_system text not null default '20' check (grading_system in ('20', '10', 'letter')),
  language text not null default 'fr' check (language in ('fr', 'en')),
  style_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teacher_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists country text,
  add column if not exists subject text,
  add column if not exists levels text[] not null default '{}',
  add column if not exists grading_system text not null default '20',
  add column if not exists language text not null default 'fr',
  add column if not exists style_notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.teacher_profiles
set
  first_name = coalesce(first_name, 'Enseignant'),
  last_name = coalesce(last_name, ''),
  country = coalesce(country, 'Canada - Quebec'),
  subject = coalesce(subject, 'Matiere non precisee'),
  levels = case
    when levels is null or cardinality(levels) = 0 then array['Niveau non precise']
    else levels
  end,
  grading_system = coalesce(grading_system, '20'),
  language = coalesce(language, 'fr');

alter table public.teacher_profiles
  alter column first_name set not null,
  alter column last_name set not null,
  alter column country set not null,
  alter column subject set not null,
  alter column levels set not null,
  alter column grading_system set not null,
  alter column language set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.teacher_profiles enable row level security;

drop policy if exists "teacher_profiles_select_own" on public.teacher_profiles;
create policy "teacher_profiles_select_own"
  on public.teacher_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "teacher_profiles_insert_own" on public.teacher_profiles;
create policy "teacher_profiles_insert_own"
  on public.teacher_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "teacher_profiles_update_own" on public.teacher_profiles;
create policy "teacher_profiles_update_own"
  on public.teacher_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_profiles_set_updated_at on public.teacher_profiles;

create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row
  execute function public.set_updated_at();
