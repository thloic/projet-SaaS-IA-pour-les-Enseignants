create table if not exists public.adaptation_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('course', 'document', 'paste', 'upload')),
  course_id uuid references public.courses(id) on delete set null,
  source_document_id uuid references public.source_documents(id) on delete set null,
  source_snapshot text not null,
  source_hash text not null,
  subject text not null,
  level text not null,
  language text not null default 'fr' check (language in ('fr', 'en')),
  status text not null default 'generating'
    check (status in ('generating', 'complete', 'partial', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adaptation_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  adaptation_set_id uuid not null references public.adaptation_sets(id) on delete cascade,
  variant_type text not null
    check (variant_type in ('standard', 'support', 'dys', 'adhd', 'enrichment')),
  content_json jsonb,
  content_md text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'complete', 'failed')),
  error_message text,
  prompt_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (adaptation_set_id, variant_type)
);

create table if not exists public.adaptation_students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  adaptation_set_id uuid not null references public.adaptation_sets(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  suggested_variant text not null
    check (suggested_variant in ('standard', 'support', 'dys', 'adhd', 'enrichment')),
  created_at timestamptz not null default now(),
  unique (adaptation_set_id, student_id)
);

create table if not exists public.adaptation_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  adaptation_set_id uuid not null references public.adaptation_sets(id) on delete cascade,
  variant_type text
    check (variant_type is null or variant_type in ('standard', 'support', 'dys', 'adhd', 'enrichment')),
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.adaptation_sets enable row level security;
alter table public.adaptation_variants enable row level security;
alter table public.adaptation_students enable row level security;
alter table public.adaptation_shares enable row level security;

drop policy if exists "adaptation_sets_own_all" on public.adaptation_sets;
create policy "adaptation_sets_own_all"
  on public.adaptation_sets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "adaptation_variants_own_all" on public.adaptation_variants;
create policy "adaptation_variants_own_all"
  on public.adaptation_variants
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.adaptation_sets
      where adaptation_sets.id = adaptation_variants.adaptation_set_id
        and adaptation_sets.user_id = auth.uid()
    )
  );

drop policy if exists "adaptation_students_own_all" on public.adaptation_students;
create policy "adaptation_students_own_all"
  on public.adaptation_students
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.adaptation_sets
      where adaptation_sets.id = adaptation_students.adaptation_set_id
        and adaptation_sets.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.student_profiles
      where student_profiles.id = adaptation_students.student_id
        and student_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "adaptation_shares_own_all" on public.adaptation_shares;
create policy "adaptation_shares_own_all"
  on public.adaptation_shares
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.adaptation_sets
      where adaptation_sets.id = adaptation_shares.adaptation_set_id
        and adaptation_sets.user_id = auth.uid()
    )
  );

create index if not exists adaptation_sets_user_created_idx
  on public.adaptation_sets(user_id, created_at desc);
create index if not exists adaptation_sets_source_hash_idx
  on public.adaptation_sets(user_id, source_hash);
create index if not exists adaptation_variants_set_idx
  on public.adaptation_variants(adaptation_set_id);
create index if not exists adaptation_students_set_idx
  on public.adaptation_students(adaptation_set_id);
create index if not exists adaptation_shares_set_idx
  on public.adaptation_shares(adaptation_set_id);

drop trigger if exists adaptation_sets_set_updated_at on public.adaptation_sets;
create trigger adaptation_sets_set_updated_at
  before update on public.adaptation_sets
  for each row execute function public.set_updated_at();

drop trigger if exists adaptation_variants_set_updated_at on public.adaptation_variants;
create trigger adaptation_variants_set_updated_at
  before update on public.adaptation_variants
  for each row execute function public.set_updated_at();

create or replace function public.get_shared_adaptation(p_token_hash text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', adaptation_sets.id,
    'title', adaptation_sets.title,
    'subject', adaptation_sets.subject,
    'level', adaptation_sets.level,
    'language', adaptation_sets.language,
    'created_at', adaptation_sets.created_at,
    'variants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'variant_type', adaptation_variants.variant_type,
            'content_json', adaptation_variants.content_json,
            'content_md', adaptation_variants.content_md
          )
          order by case adaptation_variants.variant_type
            when 'standard' then 1
            when 'support' then 2
            when 'dys' then 3
            when 'adhd' then 4
            when 'enrichment' then 5
          end
        )
        from public.adaptation_variants
        where adaptation_variants.adaptation_set_id = adaptation_sets.id
          and adaptation_variants.status = 'complete'
          and (
            adaptation_shares.variant_type is null
            or adaptation_variants.variant_type = adaptation_shares.variant_type
          )
      ),
      '[]'::jsonb
    )
  )
  from public.adaptation_shares
  join public.adaptation_sets
    on adaptation_sets.id = adaptation_shares.adaptation_set_id
  where adaptation_shares.token_hash = p_token_hash
    and adaptation_shares.revoked_at is null
    and (
      adaptation_shares.expires_at is null
      or adaptation_shares.expires_at > now()
    )
  limit 1;
$$;

revoke all on function public.get_shared_adaptation(text) from public;
grant execute on function public.get_shared_adaptation(text) to anon, authenticated;
