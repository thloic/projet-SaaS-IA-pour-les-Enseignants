alter table public.teacher_profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.teacher_profiles
  drop constraint if exists teacher_profiles_timezone_length_check;

alter table public.teacher_profiles
  add constraint teacher_profiles_timezone_length_check
  check (char_length(timezone) between 1 and 100);

update public.teacher_profiles
set timezone = case
  when lower(country) like '%mex%' then 'America/Mexico_City'
  when lower(country) like '%quebec%' then 'America/Toronto'
  when lower(country) like '%ontario%' then 'America/Toronto'
  when lower(country) like '%france%' then 'Europe/Paris'
  when lower(country) like '%senegal%' or lower(country) like '%sénégal%' then 'Africa/Dakar'
  when lower(country) like '%cameroun%' then 'Africa/Douala'
  when lower(country) like '%togo%' then 'Africa/Lome'
  when lower(country) like '%ivoire%' then 'Africa/Abidjan'
  else timezone
end
where timezone = 'UTC';

-- Les anciennes données peuvent contenir plusieurs séances ouvertes pour une classe.
-- On clôt les doublons les plus anciens à leur date de création avant d'ajouter la garde.
with ranked_open_sessions as (
  select
    id,
    row_number() over (
      partition by class_id
      order by started_at desc, created_at desc, id desc
    ) as open_rank
  from public.class_sessions
  where ended_at is null
)
update public.class_sessions
set ended_at = class_sessions.started_at
from ranked_open_sessions
where class_sessions.id = ranked_open_sessions.id
  and ranked_open_sessions.open_rank > 1;

create unique index if not exists class_sessions_one_open_per_class_idx
  on public.class_sessions(class_id)
  where ended_at is null;
