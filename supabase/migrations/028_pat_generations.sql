create table if not exists public.pat_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  language text not null default 'fr' check (language in ('fr', 'en', 'es')),
  pat jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pat_generations_student_id_idx
  on public.pat_generations(student_id);
create index if not exists pat_generations_user_created_idx
  on public.pat_generations(user_id, created_at desc);

alter table public.pat_generations enable row level security;

drop policy if exists "pat_generations_select_own" on public.pat_generations;
create policy "pat_generations_select_own"
on public.pat_generations for select
using (auth.uid() = user_id);

drop policy if exists "pat_generations_insert_own" on public.pat_generations;
create policy "pat_generations_insert_own"
on public.pat_generations for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.student_profiles student
    where student.id = student_id and student.user_id = auth.uid()
  )
  and (
    class_id is null
    or exists (
      select 1 from public.classes classroom
      where classroom.id = class_id and classroom.user_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';
