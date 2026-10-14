-- Working-copy diff for review. Same comparison as diff_versions, with the
-- published snapshot on the left and the live site (including unpublished stories) on the right.

create or replace function private.diff_snapshots(snap_a jsonb, snap_b jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
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
begin
  select v.snapshot into snap_a from public.versions v where v.id = a;
  select v.snapshot into snap_b from public.versions v where v.id = b;
  if snap_a is null or snap_b is null then
    raise exception 'VERSION_NOT_FOUND';
  end if;
  return private.diff_snapshots(snap_a, snap_b);
end;
$$;

create or replace function public.diff_working(p_site_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  snap_a jsonb;
  snap_b jsonb;
  stories jsonb;
begin
  select v.snapshot into snap_a
  from public.sites s
  join public.versions v on v.id = s.current_version_id
  where s.id = p_site_id;

  if snap_a is null then
    snap_a := jsonb_build_object('elements', '[]'::jsonb, 'stories', '[]'::jsonb);
  end if;

  snap_b := public.snapshot_site(p_site_id);

  select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'title', st.title) order by st.sort, st.id), '[]'::jsonb)
    into stories
  from public.stories st
  where st.site_id = p_site_id
    and st.status <> 'published';

  -- Published stories stay in the snapshot. Unpublished ones are added so the diff lists them.
  snap_b := jsonb_set(
    snap_b,
    '{stories}',
    coalesce(snap_b->'stories', '[]'::jsonb) || stories
  );

  return private.diff_snapshots(snap_a, snap_b);
end;
$$;

grant execute on function private.diff_snapshots(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.diff_working(uuid) to authenticated, service_role;
