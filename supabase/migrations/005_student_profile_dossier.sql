alter table public.student_profiles
  add column if not exists family_language text not null default 'fr',
  add column if not exists intervention_plan boolean not null default false,
  add column if not exists general_notes text not null default '';

update public.student_profiles
set family_language = coalesce(nullif(family_language, ''), language, 'fr')
where family_language is null or family_language = '';
