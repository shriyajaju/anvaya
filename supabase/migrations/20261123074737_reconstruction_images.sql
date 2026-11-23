-- Image-based reconstruction: tables, RLS, snapshot + content_sig updates.
-- Keeps elements.model_asset_id / transform (3D) for the feature flag path.

create type public.reconstruction_origin as enum ('generated', 'uploaded');
create type public.reconstruction_status as enum ('queued', 'generating', 'done', 'failed');

create table public.reconstruction_images (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  source_photo_id uuid references public.assets (id) on delete set null,
  image_url text,
  prompt_text text,
  provider text,
  model text,
  origin public.reconstruction_origin not null default 'generated',
  status public.reconstruction_status not null default 'queued',
  error text,
  is_current boolean not null default false,
  element_ids uuid[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reconstruction_regions (
  id uuid primary key default gen_random_uuid(),
  reconstruction_image_id uuid not null references public.reconstruction_images (id) on delete cascade,
  element_id uuid not null references public.elements (id) on delete cascade,
  shape jsonb not null,
  created_at timestamptz not null default now(),
  constraint reconstruction_regions_shape_array check (jsonb_typeof(shape) = 'array')
);

create index reconstruction_images_site_id_idx on public.reconstruction_images (site_id);
create index reconstruction_images_site_current_idx on public.reconstruction_images (site_id) where is_current;
create index reconstruction_regions_image_id_idx on public.reconstruction_regions (reconstruction_image_id);
create index reconstruction_regions_element_id_idx on public.reconstruction_regions (element_id);

-- Only one current image per site.
create unique index reconstruction_images_one_current_per_site
  on public.reconstruction_images (site_id)
  where is_current;

alter table public.reconstruction_images enable row level security;
alter table public.reconstruction_regions enable row level security;

create policy reconstruction_images_select on public.reconstruction_images
for select to authenticated
using (private.site_role(site_id) is not null);

create policy reconstruction_images_insert on public.reconstruction_images
for insert to authenticated
with check (private.site_role(site_id) in ('creator', 'admin', 'owner'));

create policy reconstruction_images_update on public.reconstruction_images
for update to authenticated
using (private.site_role(site_id) in ('creator', 'admin', 'owner'))
with check (private.site_role(site_id) in ('creator', 'admin', 'owner'));

create policy reconstruction_images_delete on public.reconstruction_images
for delete to authenticated
using (private.site_role(site_id) in ('creator', 'admin', 'owner'));

create policy reconstruction_regions_select on public.reconstruction_regions
for select to authenticated
using (
  exists (
    select 1 from public.reconstruction_images ri
    where ri.id = reconstruction_image_id
      and private.site_role(ri.site_id) is not null
  )
);

create policy reconstruction_regions_insert on public.reconstruction_regions
for insert to authenticated
with check (
  exists (
    select 1 from public.reconstruction_images ri
    where ri.id = reconstruction_image_id
      and private.site_role(ri.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy reconstruction_regions_update on public.reconstruction_regions
for update to authenticated
using (
  exists (
    select 1 from public.reconstruction_images ri
    where ri.id = reconstruction_image_id
      and private.site_role(ri.site_id) in ('creator', 'admin', 'owner')
  )
)
with check (
  exists (
    select 1 from public.reconstruction_images ri
    where ri.id = reconstruction_image_id
      and private.site_role(ri.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy reconstruction_regions_delete on public.reconstruction_regions
for delete to authenticated
using (
  exists (
    select 1 from public.reconstruction_images ri
    where ri.id = reconstruction_image_id
      and private.site_role(ri.site_id) in ('creator', 'admin', 'owner')
  )
);

-- Include current reconstruction in content signature so reviewers must re-approve after changes.
create or replace function public.content_sig(p_site_id uuid)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select md5(
    coalesce((
      select string_agg(
        e.name || '|' || e.confidence::text || '|' || e.visible::text || '|' ||
        coalesce((
          select string_agg(ee.evidence_id::text, ',' order by ee.evidence_id)
          from public.element_evidence ee
          where ee.element_id = e.id
        ), ''),
        chr(10)
        order by e.id
      )
      from public.elements e
      where e.site_id = p_site_id
    ), '')
    || chr(10)
    || coalesce((
      select string_agg(
        s.id::text || '|' || s.status::text || '|' || (
          select count(*)::text
          from public.story_steps st
          where st.story_id = s.id
        ),
        chr(10)
        order by s.id
      )
      from public.stories s
      where s.site_id = p_site_id
    ), '')
    || chr(10)
    || coalesce((
      select ri.id::text || '|' || coalesce(ri.image_url, '') || '|' ||
        coalesce((
          select string_agg(
            rr.element_id::text || ':' || rr.shape::text,
            ','
            order by rr.id
          )
          from public.reconstruction_regions rr
          where rr.reconstruction_image_id = ri.id
        ), '')
      from public.reconstruction_images ri
      where ri.site_id = p_site_id
        and ri.is_current
        and ri.status = 'done'
      limit 1
    ), '')
  );
$$;

-- Snapshot includes current reconstruction image + regions + prompt.
create or replace function public.snapshot_site(p_site_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'site', (
      select jsonb_build_object(
        'id', s.id,
        'org_id', s.org_id,
        'slug', s.slug,
        'name', s.name,
        'location', s.location,
        'site_type', s.site_type,
        'description', s.description,
        'status', s.status,
        'reconstruction_year', s.reconstruction_year,
        'managed_by', s.managed_by,
        'licence', s.licence
      )
      from public.sites s
      where s.id = p_site_id
    ),
    'settings', (select s.settings from public.sites s where s.id = p_site_id),
    'periods', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'year_from', p.year_from,
          'year_to', p.year_to,
          'sort', p.sort
        )
        order by p.sort, p.id
      )
      from public.periods p
      where p.site_id = p_site_id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'period_id', e.period_id,
          'title', e.title,
          'year', e.year,
          'approx', e.approx,
          'kind', e.kind,
          'description', e.description,
          'element_ids', e.element_ids
        )
        order by e.year nulls last, e.id
      )
      from public.events e
      where e.site_id = p_site_id
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'name', l.name,
          'plan_x', l.plan_x,
          'plan_y', l.plan_y,
          'primary_element_id', l.primary_element_id,
          'qr_code', l.qr_code
        )
        order by l.name, l.id
      )
      from public.locations l
      where l.site_id = p_site_id
    ), '[]'::jsonb),
    'elements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', el.id,
          'parent_id', el.parent_id,
          'name', el.name,
          'kind', el.kind,
          'confidence', el.confidence,
          'rationale', el.rationale,
          'assumptions', el.assumptions,
          'visible', el.visible,
          'model_asset_id', el.model_asset_id,
          'transform', el.transform,
          'plan_x', el.plan_x,
          'plan_y', el.plan_y,
          'sort', el.sort,
          'evidence', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ev.id,
                'kind', ev.kind,
                'title', ev.title,
                'citation', ev.citation,
                'date_label', ev.date_label,
                'strength', ev.strength,
                'note', ev.note,
                'url', ev.url
              )
              order by ev.id
            )
            from public.element_evidence ee
            join public.evidence ev on ev.id = ee.evidence_id
            where ee.element_id = el.id
          ), '[]'::jsonb),
          'interpretations', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', i.id,
                'label', i.label,
                'summary', i.summary,
                'confidence', i.confidence,
                'selected', i.selected,
                'evidence_ids', i.evidence_ids
              )
              order by i.id
            )
            from public.interpretations i
            where i.element_id = el.id
          ), '[]'::jsonb)
        )
        order by el.sort, el.id
      )
      from public.elements el
      where el.site_id = p_site_id
    ), '[]'::jsonb),
    'stories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'title', st.title,
          'category', st.category,
          'summary', st.summary,
          'status', st.status,
          'duration_s', st.duration_s,
          'sort', st.sort,
          'steps', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ss.id,
                'title', ss.title,
                'location_id', ss.location_id,
                'body', ss.body,
                'audio_asset_id', ss.audio_asset_id,
                'audio_duration_s', ss.audio_duration_s,
                'element_id', ss.element_id,
                'source_ids', ss.source_ids,
                'trigger', ss.trigger,
                'sort', ss.sort
              )
              order by ss.sort, ss.id
            )
            from public.story_steps ss
            where ss.story_id = st.id
          ), '[]'::jsonb)
        )
        order by st.sort, st.id
      )
      from public.stories st
      where st.site_id = p_site_id
        and st.status = 'published'
    ), '[]'::jsonb),
    'reconstruction', (
      select jsonb_build_object(
        'id', ri.id,
        'source_photo_id', ri.source_photo_id,
        'image_url', ri.image_url,
        'prompt_text', ri.prompt_text,
        'provider', ri.provider,
        'model', ri.model,
        'origin', ri.origin,
        'status', ri.status,
        'element_ids', ri.element_ids,
        'created_at', ri.created_at,
        'regions', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', rr.id,
              'element_id', rr.element_id,
              'shape', rr.shape,
              'created_at', rr.created_at
            )
            order by rr.created_at, rr.id
          )
          from public.reconstruction_regions rr
          where rr.reconstruction_image_id = ri.id
        ), '[]'::jsonb)
      )
      from public.reconstruction_images ri
      where ri.site_id = p_site_id
        and ri.is_current
        and ri.status = 'done'
      order by ri.created_at desc
      limit 1
    ),
    'counts', jsonb_build_object(
      'elements', (select count(*) from public.elements where site_id = p_site_id),
      'evidence', (select count(*) from public.evidence where site_id = p_site_id),
      'stories', (select count(*) from public.stories where site_id = p_site_id and status = 'published'),
      'locations', (select count(*) from public.locations where site_id = p_site_id),
      'questions', (select count(*) from public.questions where site_id = p_site_id)
    )
  );
$$;

grant select, insert, update, delete on public.reconstruction_images to authenticated;
grant select, insert, update, delete on public.reconstruction_regions to authenticated;
