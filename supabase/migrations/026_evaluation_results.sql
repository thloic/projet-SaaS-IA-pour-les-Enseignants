create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  title text,
  grade text not null check (char_length(btrim(grade)) between 1 and 50),
  created_at timestamptz not null default now(),
  constraint evaluation_results_title_length
    check (title is null or char_length(btrim(title)) <= 120)
);

create index if not exists evaluation_results_class_id_idx
  on public.evaluation_results(class_id);
create index if not exists evaluation_results_student_id_idx
  on public.evaluation_results(student_id);
create index if not exists evaluation_results_user_student_created_idx
  on public.evaluation_results(user_id, student_id, created_at desc);

alter table public.evaluation_results enable row level security;

drop policy if exists "evaluation_results_select_own" on public.evaluation_results;
create policy "evaluation_results_select_own"
on public.evaluation_results for select
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.classes c
    where c.id = class_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.class_students cs
    where cs.class_id = class_id
      and cs.student_id = student_id
      and cs.user_id = auth.uid()
  )
);

drop policy if exists "evaluation_results_insert_own" on public.evaluation_results;
create policy "evaluation_results_insert_own"
on public.evaluation_results for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.classes c
    where c.id = class_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.class_students cs
    where cs.class_id = class_id
      and cs.student_id = student_id
      and cs.user_id = auth.uid()
  )
);

drop policy if exists "evaluation_results_update_own" on public.evaluation_results;
create policy "evaluation_results_update_own"
on public.evaluation_results for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.classes c
    where c.id = class_id and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.class_students cs
    where cs.class_id = class_id
      and cs.student_id = student_id
      and cs.user_id = auth.uid()
  )
);

drop policy if exists "evaluation_results_delete_own" on public.evaluation_results;
create policy "evaluation_results_delete_own"
on public.evaluation_results for delete
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
