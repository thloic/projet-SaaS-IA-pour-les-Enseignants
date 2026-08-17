-- La langue de l'interface et celle des contenus générés sont deux préférences
-- distinctes. Les profils existants conservent leur choix actuel pour les deux.

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_language_check;

alter table public.teacher_profiles
  add constraint teacher_profiles_language_check
  check (language in ('fr', 'en', 'es'));

alter table public.teacher_profiles
  add column if not exists interface_language text;

update public.teacher_profiles
set interface_language = language
where interface_language is null;

alter table public.teacher_profiles
  alter column interface_language set default 'en',
  alter column interface_language set not null;

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_interface_language_check;

alter table public.teacher_profiles
  add constraint teacher_profiles_interface_language_check
  check (interface_language in ('fr', 'en', 'es'));

alter table public.adaptation_sets
  drop constraint if exists adaptation_sets_language_check;

alter table public.adaptation_sets
  add constraint adaptation_sets_language_check
  check (language in ('fr', 'en', 'es'));
