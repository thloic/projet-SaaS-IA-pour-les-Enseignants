create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  sex text not null default 'M' check (sex in ('M', 'F')),
  needs text[] not null default '{}',
  language text not null default 'fr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  session_date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table if not exists public.participation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  value integer not null check (value in (-1, 1, 2)),
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  category text not null check (category in ('behavior', 'effort', 'attention', 'homework', 'progress', 'other')),
  tag text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;
alter table public.student_profiles enable row level security;
alter table public.class_students enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.participation_events enable row level security;
alter table public.student_observations enable row level security;

drop policy if exists "classes_own_all" on public.classes;
create policy "classes_own_all"
  on public.classes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "student_profiles_own_all" on public.student_profiles;
create policy "student_profiles_own_all"
  on public.student_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "class_students_own_all" on public.class_students;
create policy "class_students_own_all"
  on public.class_students
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.classes
      where classes.id = class_students.class_id
      and classes.user_id = auth.uid()
    )
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = class_students.student_id
      and student_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "class_sessions_own_all" on public.class_sessions;
create policy "class_sessions_own_all"
  on public.class_sessions
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.classes
      where classes.id = class_sessions.class_id
      and classes.user_id = auth.uid()
    )
  );

drop policy if exists "attendance_records_own_all" on public.attendance_records;
create policy "attendance_records_own_all"
  on public.attendance_records
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.class_sessions
      where class_sessions.id = attendance_records.session_id
      and class_sessions.user_id = auth.uid()
    )
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = attendance_records.student_id
      and student_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "participation_events_own_all" on public.participation_events;
create policy "participation_events_own_all"
  on public.participation_events
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.class_sessions
      where class_sessions.id = participation_events.session_id
      and class_sessions.user_id = auth.uid()
    )
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = participation_events.student_id
      and student_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "student_observations_own_all" on public.student_observations;
create policy "student_observations_own_all"
  on public.student_observations
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.class_sessions
      where class_sessions.id = student_observations.session_id
      and class_sessions.user_id = auth.uid()
    )
    and exists (
      select 1 from public.student_profiles
      where student_profiles.id = student_observations.student_id
      and student_profiles.user_id = auth.uid()
    )
  );

create index if not exists classes_user_id_idx on public.classes(user_id);
create index if not exists student_profiles_user_id_idx on public.student_profiles(user_id);
create index if not exists class_students_class_id_idx on public.class_students(class_id);
create index if not exists class_sessions_class_id_idx on public.class_sessions(class_id);
create index if not exists attendance_records_session_id_idx on public.attendance_records(session_id);
create index if not exists participation_events_session_id_idx on public.participation_events(session_id);
create index if not exists student_observations_session_id_idx on public.student_observations(session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists classes_set_updated_at on public.classes;
create trigger classes_set_updated_at
  before update on public.classes
  for each row
  execute function public.set_updated_at();

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists attendance_records_set_updated_at on public.attendance_records;
create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row
  execute function public.set_updated_at();
