-- Réparation idempotente pour les environnements où la migration 006 n'a pas
-- été appliquée, ou lorsque le cache PostgREST connaît encore l'ancien schéma.

alter table public.teacher_profiles
  add column if not exists subjects text[] not null default '{}';

update public.teacher_profiles
set subjects = array[subject]
where cardinality(subjects) = 0
  and subject is not null
  and btrim(subject) <> '';

update public.teacher_profiles
set subjects = array['Matiere non precisee']
where cardinality(subjects) = 0;

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_subjects_not_empty;

alter table public.teacher_profiles
  add constraint teacher_profiles_subjects_not_empty
  check (cardinality(subjects) > 0);

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_grading_system_check;

alter table public.teacher_profiles
  alter column grading_system type text using grading_system::text;

update public.teacher_profiles
set grading_system = '20'
where grading_system is null
   or grading_system not in ('20', '10', 'letter');

alter table public.teacher_profiles
  alter column grading_system set default '20',
  alter column grading_system set not null;

alter table public.teacher_profiles
  add constraint teacher_profiles_grading_system_check
  check (grading_system in ('20', '10', 'letter'));

select pg_notify('pgrst', 'reload schema');
