-- ANVAYA §5 functions and triggers.
-- Privileged helpers live in private so they are not exposed through the Data API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.site_role(p_site_id uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.sites s
  join public.org_members m on m.org_id = s.org_id
  where s.id = p_site_id
    and m.user_id = auth.uid();
$$;

create or replace function private.org_role(p_org_id uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.org_members m
  where m.org_id = p_org_id
    and m.user_id = auth.uid();
$$;

create or replace function private.org_has_members(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m where m.org_id = p_org_id
  );
$$;

revoke all on function private.site_role(uuid) from public;
revoke all on function private.org_role(uuid) from public;
revoke all on function private.org_has_members(uuid) from public;
grant execute on function private.site_role(uuid) to authenticated, service_role;
grant execute on function private.org_role(uuid) to authenticated, service_role;
grant execute on function private.org_has_members(uuid) to authenticated, service_role;

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
  );
$$;

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
    'counts', jsonb_build_object(
      'elements', (select count(*) from public.elements where site_id = p_site_id),
      'evidence', (select count(*) from public.evidence where site_id = p_site_id),
      'stories', (select count(*) from public.stories where site_id = p_site_id and status = 'published'),
      'locations', (select count(*) from public.locations where site_id = p_site_id),
      'questions', (select count(*) from public.questions where site_id = p_site_id)
    )
  );
$$;

create or replace function public.can_approve(p_review_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.reviews r
    join public.sites s on s.id = r.site_id
    join public.org_members m
      on m.org_id = s.org_id
     and m.user_id = auth.uid()
    where r.id = p_review_id
      and m.role in ('reviewer', 'admin', 'owner')
      and r.submitted_by is distinct from auth.uid()
  );
$$;

create or replace function public.can_publish(p_site_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.sites s
    join public.org_members m
      on m.org_id = s.org_id
     and m.user_id = auth.uid()
    where s.id = p_site_id
      and m.role in ('admin', 'owner')
      and (
        s.require_review = false
        or exists (
          select 1
          from public.reviews r
          where r.site_id = s.id
            and r.id = (
              select r2.id
              from public.reviews r2
              where r2.site_id = s.id
              order by r2.submitted_at desc, r2.id desc
              limit 1
            )
            and r.status = 'approved'
            and r.content_sig is not distinct from public.content_sig(s.id)
        )
      )
  );
$$;

create or replace function private.publish_site(p_site_id uuid, p_number text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_snap jsonb;
begin
  if not public.can_publish(p_site_id) then
    raise exception 'CANNOT_PUBLISH';
  end if;

  v_snap := public.snapshot_site(p_site_id);

  insert into public.versions (
    site_id, number, note, published_by, published_at, snapshot, checksum
  )
  values (
    p_site_id, p_number, p_note, auth.uid(), now(), v_snap, md5(v_snap::text)
  )
  returning id into v_id;

  update public.sites
  set current_version_id = v_id,
      status = 'published'
  where id = p_site_id;

  return v_id;
end;
$$;

create or replace function public.publish_site(p_site_id uuid, p_number text, p_note text)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select private.publish_site(p_site_id, p_number, p_note);
$$;

create or replace function public.diff_versions(a uuid, b uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  snap_a jsonb;
  snap_b jsonb;
  result jsonb := '[]'::jsonb;
  el_a jsonb;
  el_b jsonb;
  ids_a text[];
  ids_b text[];
  eid text;
  ev_a text[];
  ev_b text[];
  src text;
  story_a text[];
  story_b text[];
  sid text;
begin
  select v.snapshot into snap_a from public.versions v where v.id = a;
  select v.snapshot into snap_b from public.versions v where v.id = b;
  if snap_a is null or snap_b is null then
    raise exception 'VERSION_NOT_FOUND';
  end if;

  select coalesce(array_agg(el->>'id'), '{}')
    into ids_a
  from jsonb_array_elements(coalesce(snap_a->'elements', '[]'::jsonb)) el;

  select coalesce(array_agg(el->>'id'), '{}')
    into ids_b
  from jsonb_array_elements(coalesce(snap_b->'elements', '[]'::jsonb)) el;

  for eid in
    select x from unnest(ids_b) as t(x) where not (x = any (ids_a))
  loop
    select el into el_b
    from jsonb_array_elements(snap_b->'elements') el
    where el->>'id' = eid
    limit 1;
    result := result || jsonb_build_array(jsonb_build_object(
      'type', 'added',
      'element_id', eid,
      'name', el_b->>'name'
    ));
  end loop;

  for eid in
    select x from unnest(ids_a) as t(x) where not (x = any (ids_b))
  loop
    select el into el_a
    from jsonb_array_elements(snap_a->'elements') el
    where el->>'id' = eid
    limit 1;
    result := result || jsonb_build_array(jsonb_build_object(
      'type', 'removed',
      'element_id', eid,
      'name', el_a->>'name'
    ));
  end loop;

  for eid in
    select x from unnest(ids_a) as t(x) where x = any (ids_b)
  loop
    select el into el_a
    from jsonb_array_elements(snap_a->'elements') el
    where el->>'id' = eid
    limit 1;
    select el into el_b
    from jsonb_array_elements(snap_b->'elements') el
    where el->>'id' = eid
    limit 1;

    if el_a->>'confidence' is distinct from el_b->>'confidence' then
      result := result || jsonb_build_array(jsonb_build_object(
        'type', 'confidence_changed',
        'element_id', eid,
        'name', el_b->>'name',
        'from', el_a->>'confidence',
        'to', el_b->>'confidence'
      ));
    end if;

    select coalesce(array_agg(ev->>'id'), '{}')
      into ev_a
    from jsonb_array_elements(coalesce(el_a->'evidence', '[]'::jsonb)) ev;
    select coalesce(array_agg(ev->>'id'), '{}')
      into ev_b
    from jsonb_array_elements(coalesce(el_b->'evidence', '[]'::jsonb)) ev;

    for src in
      select x from unnest(ev_b) as t(x) where not (x = any (ev_a))
    loop
      result := result || jsonb_build_array(jsonb_build_object(
        'type', 'source_added',
        'element_id', eid,
        'evidence_id', src
      ));
    end loop;
  end loop;

  select coalesce(array_agg(st->>'id'), '{}')
    into story_a
  from jsonb_array_elements(coalesce(snap_a->'stories', '[]'::jsonb)) st;
  select coalesce(array_agg(st->>'id'), '{}')
    into story_b
  from jsonb_array_elements(coalesce(snap_b->'stories', '[]'::jsonb)) st;

  for sid in
    select x from unnest(story_b) as t(x) where not (x = any (story_a))
  loop
    result := result || jsonb_build_array(jsonb_build_object(
      'type', 'story_published',
      'story_id', sid
    ));
  end loop;

  return result;
end;
$$;

create or replace function private.enforce_high_needs_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required boolean;
  v_confidence public.confidence_level;
  v_site_id uuid;
begin
  if tg_table_name = 'elements' and tg_op = 'UPDATE' then
    if new.confidence = 'high' then
      select coalesce((s.settings->>'requireSourceForHigh')::boolean, true)
        into v_required
      from public.sites s
      where s.id = new.site_id;

      if v_required and not exists (
        select 1 from public.element_evidence ee where ee.element_id = new.id
      ) then
        raise exception 'HIGH_NEEDS_EVIDENCE';
      end if;
    end if;
    return new;
  end if;

  if tg_table_name = 'element_evidence' and tg_op = 'DELETE' then
    select e.confidence, e.site_id, coalesce((s.settings->>'requireSourceForHigh')::boolean, true)
      into v_confidence, v_site_id, v_required
    from public.elements e
    join public.sites s on s.id = e.site_id
    where e.id = old.element_id;

    if v_required
      and v_confidence = 'high'
      and not exists (
        select 1 from public.element_evidence ee where ee.element_id = old.element_id
      )
    then
      update public.elements
      set confidence = 'medium'
      where id = old.element_id;

      insert into public.questions (site_id, element_id, question, status, level, raised_by)
      values (
        v_site_id,
        old.element_id,
        'Evidence removed — confidence re-rated',
        'open',
        'medium',
        auth.uid()
      );
    end if;
    return old;
  end if;

  return null;
end;
$$;

create trigger elements_enforce_high_needs_evidence
before update of confidence on public.elements
for each row execute function private.enforce_high_needs_evidence();

create trigger element_evidence_downgrade_high
after delete on public.element_evidence
for each row execute function private.enforce_high_needs_evidence();

create or replace function private.reject_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'VERSIONS_IMMUTABLE';
end;
$$;

create trigger versions_immutable
before update or delete on public.versions
for each row execute function private.reject_version_mutation();

revoke all on function private.publish_site(uuid, text, text) from public;
revoke all on function private.enforce_high_needs_evidence() from public;
revoke all on function private.reject_version_mutation() from public;
grant execute on function private.publish_site(uuid, text, text) to authenticated, service_role;

revoke all on function public.content_sig(uuid) from public;
revoke all on function public.snapshot_site(uuid) from public;
revoke all on function public.can_approve(uuid) from public;
revoke all on function public.can_publish(uuid) from public;
revoke all on function public.publish_site(uuid, text, text) from public;
revoke all on function public.diff_versions(uuid, uuid) from public;
revoke all on function public.touch_updated_at() from public;
grant execute on function public.touch_updated_at() to authenticated;

grant execute on function public.content_sig(uuid) to authenticated;
grant execute on function public.snapshot_site(uuid) to authenticated;
grant execute on function public.can_approve(uuid) to authenticated;
grant execute on function public.can_publish(uuid) to authenticated;
grant execute on function public.publish_site(uuid, text, text) to authenticated;
grant execute on function public.diff_versions(uuid, uuid) to anon, authenticated;
