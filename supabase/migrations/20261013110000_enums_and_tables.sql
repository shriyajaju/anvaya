-- ANVAYA §5: enums, tables, foreign keys, indexes.

create type public.confidence_level as enum ('high', 'medium', 'low');
create type public.evidence_kind as enum (
  'physical',
  'archaeological',
  'historical',
  'comparative',
  'visual',
  'scholarly'
);
create type public.site_status as enum ('draft', 'in_review', 'published', 'archived');
create type public.org_role as enum ('owner', 'admin', 'creator', 'reviewer', 'viewer');
create type public.element_kind as enum ('group', 'structure', 'architectural', 'object');
create type public.question_status as enum ('open', 'resolved');
create type public.comment_target as enum ('element', 'story', 'review_item');
create type public.story_status as enum ('draft', 'in_review', 'approved', 'published');
create type public.story_trigger as enum ('arrival', 'tap', 'scan');
create type public.asset_kind as enum ('photo', 'model', 'usdz', 'document', 'audio', 'drawing');
create type public.condition_state as enum ('good', 'fair', 'poor');
create type public.review_status as enum ('open', 'changes_requested', 'approved', 'withdrawn');
create type public.review_item_target as enum ('element', 'story');
create type public.review_item_status as enum ('waiting', 'approved', 'changes');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  initials text,
  title text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.org_members (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  primary key (org_id, user_id)
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  slug text not null unique,
  name text not null,
  location text,
  site_type text,
  description text,
  status public.site_status not null default 'draft',
  reconstruction_year integer,
  require_review boolean not null default true,
  settings jsonb not null default '{"requireSourceForHigh":true,"warnNoEvidence":true,"showAssumptions":true,"showAlternatives":true,"collectFeedback":true}'::jsonb,
  managed_by text,
  licence text,
  current_version_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  year_from integer,
  year_to integer,
  sort integer not null default 0
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  period_id uuid references public.periods (id) on delete set null,
  title text not null,
  year integer,
  approx boolean not null default false,
  kind text,
  description text,
  element_ids uuid[] not null default '{}'
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  kind public.asset_kind not null,
  storage_path text not null,
  filename text not null,
  bytes bigint,
  mime text,
  width integer,
  height integer,
  caption text,
  taken_on date,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.elements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  parent_id uuid references public.elements (id) on delete cascade,
  name text not null,
  kind public.element_kind not null,
  confidence public.confidence_level not null default 'low',
  rationale text,
  assumptions text[] not null default '{}',
  visible boolean not null default true,
  model_asset_id uuid references public.assets (id) on delete set null,
  transform jsonb,
  plan_x double precision,
  plan_y double precision,
  sort integer not null default 0
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null,
  plan_x double precision,
  plan_y double precision,
  primary_element_id uuid references public.elements (id) on delete set null,
  qr_code text unique
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  kind public.evidence_kind not null,
  title text not null,
  citation text,
  date_label text,
  strength public.confidence_level not null,
  note text,
  asset_id uuid references public.assets (id) on delete set null,
  url text,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.element_evidence (
  element_id uuid not null references public.elements (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  primary key (element_id, evidence_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  element_id uuid references public.elements (id) on delete set null,
  question text not null,
  context text,
  status public.question_status not null default 'open',
  level public.confidence_level not null,
  raised_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.interpretations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  element_id uuid not null references public.elements (id) on delete cascade,
  label text not null,
  summary text,
  confidence public.confidence_level not null,
  selected boolean not null default false,
  evidence_ids uuid[] not null default '{}'
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  target_type public.comment_target not null,
  target_id uuid not null,
  author uuid not null references public.profiles (id),
  body text not null,
  parent_id uuid references public.comments (id) on delete cascade,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  title text not null,
  category text,
  summary text,
  status public.story_status not null default 'draft',
  duration_s integer,
  sort integer not null default 0
);

create table public.story_steps (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  title text not null,
  location_id uuid references public.locations (id) on delete set null,
  body text,
  audio_asset_id uuid references public.assets (id) on delete set null,
  audio_duration_s integer,
  element_id uuid references public.elements (id) on delete set null,
  source_ids uuid[] not null default '{}',
  trigger public.story_trigger not null,
  sort integer not null default 0
);

create table public.condition (
  site_id uuid primary key references public.sites (id) on delete cascade,
  state public.condition_state not null,
  notes text,
  surveyed_at date,
  survival jsonb not null default '{}'::jsonb
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  element_id uuid references public.elements (id) on delete set null,
  dimension text not null,
  value numeric,
  unit text,
  method text
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  status public.review_status not null default 'open',
  submitted_by uuid not null references public.profiles (id),
  submitted_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  content_sig text
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  target_type public.review_item_target not null,
  target_id uuid not null,
  status public.review_item_status not null default 'waiting'
);

create table public.versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  number text not null,
  note text,
  published_by uuid references public.profiles (id),
  published_at timestamptz not null default now(),
  snapshot jsonb not null,
  checksum text not null,
  unique (site_id, number)
);

alter table public.sites
  add constraint sites_current_version_id_fkey
  foreign key (current_version_id) references public.versions (id) on delete set null;

create table public.analytics_events (
  id bigserial primary key,
  site_id uuid not null references public.sites (id) on delete cascade,
  version_id uuid references public.versions (id) on delete set null,
  type text not null,
  element_id uuid references public.elements (id) on delete set null,
  location_id uuid references public.locations (id) on delete set null,
  session_id text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  version_id uuid references public.versions (id) on delete set null,
  understand smallint,
  trust smallint,
  comment text,
  page text,
  session_id text not null,
  at timestamptz not null default now(),
  constraint feedback_understand_range check (understand is null or understand between 1 and 5),
  constraint feedback_trust_range check (trust is null or trust between 1 and 5)
);

create index org_members_user_id_idx on public.org_members (user_id);
create index sites_org_id_idx on public.sites (org_id);
create index sites_status_idx on public.sites (status);
create index periods_site_id_idx on public.periods (site_id);
create index events_site_id_idx on public.events (site_id);
create index events_period_id_idx on public.events (period_id);
create index assets_site_id_idx on public.assets (site_id);
create index elements_site_id_idx on public.elements (site_id);
create index elements_parent_id_idx on public.elements (parent_id);
create index elements_model_asset_id_idx on public.elements (model_asset_id);
create index locations_site_id_idx on public.locations (site_id);
create index locations_primary_element_id_idx on public.locations (primary_element_id);
create index evidence_site_id_idx on public.evidence (site_id);
create index evidence_asset_id_idx on public.evidence (asset_id);
create index element_evidence_evidence_id_idx on public.element_evidence (evidence_id);
create index questions_site_id_idx on public.questions (site_id);
create index questions_element_id_idx on public.questions (element_id);
create index interpretations_site_id_idx on public.interpretations (site_id);
create index interpretations_element_id_idx on public.interpretations (element_id);
create index comments_site_id_idx on public.comments (site_id);
create index comments_target_idx on public.comments (target_type, target_id);
create index comments_parent_id_idx on public.comments (parent_id);
create index stories_site_id_idx on public.stories (site_id);
create index story_steps_story_id_idx on public.story_steps (story_id);
create index story_steps_location_id_idx on public.story_steps (location_id);
create index story_steps_element_id_idx on public.story_steps (element_id);
create index story_steps_audio_asset_id_idx on public.story_steps (audio_asset_id);
create index measurements_site_id_idx on public.measurements (site_id);
create index measurements_element_id_idx on public.measurements (element_id);
create index reviews_site_id_idx on public.reviews (site_id);
create index reviews_status_idx on public.reviews (status);
create index review_items_review_id_idx on public.review_items (review_id);
create index versions_site_id_idx on public.versions (site_id);
create index analytics_events_site_id_idx on public.analytics_events (site_id);
create index analytics_events_version_id_idx on public.analytics_events (version_id);
create index feedback_site_id_idx on public.feedback (site_id);
create index feedback_version_id_idx on public.feedback (version_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sites_touch_updated_at
before update on public.sites
for each row execute function public.touch_updated_at();
