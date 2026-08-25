alter table public.teacher_profiles
  add column if not exists onboarding_tour_seen boolean not null default false;

notify pgrst, 'reload schema';
