-- Camera overlay: viewpoint fields on source photos, edge guide + wireframe on reconstructions.

alter table public.assets
  add column if not exists viewpoint_label text,
  add column if not exists viewpoint_note text,
  add column if not exists edge_outline_url text;

alter table public.reconstruction_images
  add column if not exists edge_guide_url text,
  add column if not exists wireframe_url text;

-- Snapshot includes viewpoint + guide assets for the visitor camera overlay.
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
        'edge_guide_url', coalesce(ri.edge_guide_url, src.edge_outline_url),
        'wireframe_url', ri.wireframe_url,
        'viewpoint_label', src.viewpoint_label,
        'viewpoint_note', src.viewpoint_note,
        'source_photo_url', case
          when src.storage_path is null then null
          when src.storage_path like 'seed-%' or src.storage_path like 'site-covers/%' or src.storage_path like 'seed-reconstructions/%'
            then '/' || src.storage_path
          else src.storage_path
        end,
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
      left join public.assets src on src.id = ri.source_photo_id
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
