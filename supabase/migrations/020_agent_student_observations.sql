alter table public.student_observations
  alter column session_id drop not null;

drop policy if exists "student_observations_own_all" on public.student_observations;
drop policy if exists "student_observations_select_own" on public.student_observations;
drop policy if exists "student_observations_insert_own" on public.student_observations;
drop policy if exists "student_observations_update_own" on public.student_observations;
drop policy if exists "student_observations_delete_own" on public.student_observations;

create policy "student_observations_select_own"
  on public.student_observations
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.student_profiles
      where student_profiles.id = student_observations.student_id
        and student_profiles.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where class_students.student_id = student_observations.student_id
        and class_students.user_id = auth.uid()
        and classes.user_id = auth.uid()
    )
  );

create policy "student_observations_insert_own"
  on public.student_observations
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.student_profiles
      where student_profiles.id = student_observations.student_id
        and student_profiles.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where class_students.student_id = student_observations.student_id
        and class_students.user_id = auth.uid()
        and classes.user_id = auth.uid()
    )
    and (
      session_id is null
      or exists (
        select 1
        from public.class_sessions
        join public.class_students
          on class_students.class_id = class_sessions.class_id
         and class_students.student_id = student_observations.student_id
         and class_students.user_id = auth.uid()
        where class_sessions.id = student_observations.session_id
          and class_sessions.user_id = auth.uid()
      )
    )
  );

create policy "student_observations_update_own"
  on public.student_observations
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where class_students.student_id = student_observations.student_id
        and class_students.user_id = auth.uid()
        and classes.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.student_profiles
      where student_profiles.id = student_observations.student_id
        and student_profiles.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where class_students.student_id = student_observations.student_id
        and class_students.user_id = auth.uid()
        and classes.user_id = auth.uid()
    )
    and (
      session_id is null
      or exists (
        select 1
        from public.class_sessions
        join public.class_students
          on class_students.class_id = class_sessions.class_id
         and class_students.student_id = student_observations.student_id
         and class_students.user_id = auth.uid()
        where class_sessions.id = student_observations.session_id
          and class_sessions.user_id = auth.uid()
      )
    )
  );

create policy "student_observations_delete_own"
  on public.student_observations
  for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.class_students
      join public.classes on classes.id = class_students.class_id
      where class_students.student_id = student_observations.student_id
        and class_students.user_id = auth.uid()
        and classes.user_id = auth.uid()
    )
  );

create index if not exists student_observations_user_student_created_idx
  on public.student_observations(user_id, student_id, created_at desc);

select pg_notify('pgrst', 'reload schema');
