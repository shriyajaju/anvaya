-- Kanheri Caves placeholder seed (§11). Not a historical account.
-- Citations are marked "(placeholder reference)". Version 1.0 is produced by snapshot_site.

do $$
declare
  v_iyer uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001';
  v_mehta uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002';
  v_rao uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003';
  v_org uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0010';
  v_site uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020';
  v_period uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0030';
  v_event uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0031';
  v_remains uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0041';
  v_roof_model uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0042';
  v_lintel uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0043';
  v_frieze_model uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0044';
  v_cistern_model uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0045';
  v_cave uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0051';
  v_north uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0052';
  v_entrance uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0053';
  v_roof uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0054';
  v_frieze uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0055';
  v_cistern uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0056';
  v_ev1 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0061';
  v_ev2 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0062';
  v_ev3 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0063';
  v_ev4 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0064';
  v_ev5 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0065';
  v_l1 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0091';
  v_l2 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0092';
  v_l3 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0093';
  v_l4 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0094';
  v_l5 uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0095';
  v_story uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa00a1';
  v_review uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa00c1';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_iyer, 'authenticated', 'authenticated', 'a.iyer@anvaya.test', extensions.crypt('placeholder', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_mehta, 'authenticated', 'authenticated', 'r.mehta@anvaya.test', extensions.crypt('placeholder', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_rao, 'authenticated', 'authenticated', 's.rao@anvaya.test', extensions.crypt('placeholder', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values
    ('a.iyer@anvaya.test', v_iyer, jsonb_build_object('sub', v_iyer::text, 'email', 'a.iyer@anvaya.test'), 'email', now(), now()),
    ('r.mehta@anvaya.test', v_mehta, jsonb_build_object('sub', v_mehta::text, 'email', 'r.mehta@anvaya.test'), 'email', now(), now()),
    ('s.rao@anvaya.test', v_rao, jsonb_build_object('sub', v_rao::text, 'email', 's.rao@anvaya.test'), 'email', now(), now());

  insert into public.profiles (id, name, initials, title)
  values
    (v_iyer, 'A. Iyer', 'AI', 'Conservation architect'),
    (v_mehta, 'R. Mehta', 'RM', 'Archaeologist'),
    (v_rao, 'S. Rao', 'SR', 'Trust director');

  insert into public.organisations (id, name, slug)
  values (v_org, 'Kanheri Caves Trust', 'kanheri-trust');

  insert into public.org_members (org_id, user_id, role)
  values
    (v_org, v_iyer, 'creator'),
    (v_org, v_mehta, 'reviewer'),
    (v_org, v_rao, 'admin');

  insert into public.sites (
    id, org_id, slug, name, location, site_type, description, status,
    reconstruction_year, require_review, managed_by, licence, created_by
  )
  values (
    v_site, v_org, 'kanheri', 'Kanheri Caves', 'Mumbai',
    'rock-cut Buddhist caves',
    'Placeholder record for Kanheri Caves, Cave 3, c. 200 CE. Not a historical account.',
    'draft', 200, true, 'S. Rao', 'Placeholder licence', v_iyer
  );

  insert into public.periods (id, site_id, name, year_from, year_to, sort)
  values (v_period, v_site, 'c. 200 CE (placeholder)', 150, 250, 0);

  insert into public.events (id, site_id, period_id, title, year, approx, kind, description, element_ids)
  values (
    v_event, v_site, v_period, 'Cave 3 (placeholder)', 200, true, 'phase',
    'Placeholder. Not a historical account.',
    array[v_cave]
  );

  insert into public.assets (id, site_id, kind, storage_path, filename, bytes, mime, caption, uploaded_by)
  values
    (v_remains, v_site, 'model', 'seed-models/existing-remains.glb', 'existing-remains.glb', 728, 'model/gltf-binary', 'Placeholder existing remains', v_iyer),
    (v_roof_model, v_site, 'model', 'seed-models/roof-prism.glb', 'roof-prism.glb', 680, 'model/gltf-binary', 'Placeholder roof prism', v_iyer),
    (v_lintel, v_site, 'model', 'seed-models/lintel.glb', 'lintel.glb', 740, 'model/gltf-binary', 'Placeholder lintel', v_iyer),
    (v_frieze_model, v_site, 'model', 'seed-models/frieze-band.glb', 'frieze-band.glb', 736, 'model/gltf-binary', 'Placeholder frieze band', v_iyer),
    (v_cistern_model, v_site, 'model', 'seed-models/cistern-cover.glb', 'cistern-cover.glb', 736, 'model/gltf-binary', 'Placeholder cistern cover', v_iyer);

  insert into public.elements (
    id, site_id, parent_id, name, kind, confidence, rationale, assumptions, model_asset_id, plan_x, plan_y, sort
  )
  values
    (v_cave, v_site, null, 'Cave 3', 'group', 'medium', null, '{}', v_remains, 0.5, 0.4, 0),
    (v_north, v_site, v_cave, 'North wall', 'architectural', 'high', null, '{}', null, 0.5, 0.2, 1),
    (v_entrance, v_site, v_cave, 'Entrance', 'architectural', 'high', null, array['Door leaves were timber, now lost'], v_lintel, 0.5, 0.75, 2),
    (v_roof, v_site, v_cave, 'Roof', 'architectural', 'medium',
      'Roof form inferred from surviving beam sockets and comparison with Cave 3 at Karla. No direct evidence of the ridge height.',
      array['Ridge height estimated at 4.2 m', 'Timber species unknown'],
      v_roof_model, 0.5, 0.45, 3),
    (v_frieze, v_site, v_cave, 'Decorative frieze', 'architectural', 'low', null, '{}', v_frieze_model, 0.55, 0.7, 4),
    (v_cistern, v_site, v_cave, 'Water cistern', 'object', 'low', null, '{}', v_cistern_model, 0.2, 0.3, 5);

  insert into public.evidence (id, site_id, kind, title, citation, date_label, strength, added_by)
  values
    (v_ev1, v_site, 'physical', 'Beam socket survey 2026', 'Beam socket survey 2026 (placeholder reference)', '2026', 'high', v_iyer),
    (v_ev2, v_site, 'historical', 'Fergusson & Burgess 1880 pl. 12', 'Fergusson & Burgess 1880 pl. 12 (placeholder reference)', '1880', 'medium', v_iyer),
    (v_ev3, v_site, 'comparative', 'Cave 3 at Karla roof profile', 'Cave 3 at Karla roof profile (placeholder reference)', null, 'medium', v_iyer),
    (v_ev4, v_site, 'visual', 'Site photograph 1962', 'Site photograph 1962 (placeholder reference)', '1962', 'high', v_iyer),
    (v_ev5, v_site, 'scholarly', 'Nagaraju 1981', 'Nagaraju 1981 (placeholder reference)', '1981', 'low', v_iyer);

  insert into public.element_evidence (element_id, evidence_id)
  values
    (v_roof, v_ev1), (v_roof, v_ev2), (v_roof, v_ev3),
    (v_north, v_ev1), (v_north, v_ev2), (v_north, v_ev4),
    (v_entrance, v_ev1), (v_entrance, v_ev2), (v_entrance, v_ev4),
    (v_frieze, v_ev4);

  insert into public.questions (site_id, element_id, question, status, level, raised_by)
  values
    (v_site, v_roof, 'Roof form (placeholder)', 'open', 'low', v_iyer),
    (v_site, v_entrance, 'Entrance height (placeholder)', 'open', 'medium', v_mehta),
    (v_site, v_cistern, 'Cisterns roofed (placeholder)', 'open', 'medium', v_iyer);

  insert into public.interpretations (site_id, element_id, label, summary, confidence, selected, evidence_ids)
  values
    (v_site, v_roof, 'Pitched timber ridge ~4.2 m', 'Placeholder interpretation. Not a historical account.', 'medium', true, array[v_ev1, v_ev2, v_ev3]),
    (v_site, v_roof, 'Flat timber on brackets', 'Placeholder interpretation. Not a historical account.', 'low', false, '{}');

  insert into public.locations (id, site_id, name, plan_x, plan_y, primary_element_id, qr_code)
  values
    (v_l1, v_site, 'L1 Entrance', 0.5, 0.8, v_entrance, 'kanheri-L1'),
    (v_l2, v_site, 'L2 Cave 3', 0.5, 0.5, v_cave, 'kanheri-L2'),
    (v_l3, v_site, 'L3 Cave 3 interior', 0.45, 0.35, v_north, 'kanheri-L3'),
    (v_l4, v_site, 'L4 Water cistern', 0.2, 0.3, v_cistern, 'kanheri-L4'),
    (v_l5, v_site, 'L5 Viewpoint path', 0.8, 0.85, null, 'kanheri-L5');

  insert into public.stories (id, site_id, title, category, summary, status, duration_s, sort)
  values (
    v_story, v_site, 'Daily life at Kanheri', 'daily life',
    'Placeholder story. Not a historical account.', 'published', 180, 0
  );

  insert into public.story_steps (story_id, title, location_id, body, element_id, trigger, sort)
  values
    (v_story, 'Arrival', v_l1, 'Placeholder. This step is not a historical account.', v_entrance, 'arrival', 0),
    (v_story, 'Cave front', v_l2, 'Placeholder. This step is not a historical account.', v_cave, 'tap', 1),
    (v_story, 'Interior', v_l3, 'Placeholder. This step is not a historical account.', v_north, 'scan', 2),
    (v_story, 'Cistern', v_l4, 'Placeholder. This step is not a historical account.', v_cistern, 'tap', 3),
    (v_story, 'Viewpoint', v_l5, 'Placeholder. This step is not a historical account.', null, 'arrival', 4);

  insert into public.condition (site_id, state, notes, surveyed_at, survival)
  values (v_site, 'fair', 'Placeholder survey note.', '2026-01-01', '{"cave3":"partial"}'::jsonb);

  insert into public.reviews (id, site_id, status, submitted_by, decided_by, decided_at, content_sig)
  values (
    v_review, v_site, 'approved', v_iyer, v_rao, now(), public.content_sig(v_site)
  );

  insert into public.review_items (review_id, target_type, target_id, status)
  values (v_review, 'element', v_roof, 'approved');

  perform set_config('request.jwt.claim.sub', v_rao::text, true);
  perform public.publish_site(v_site, '1.0', 'Placeholder publication of Kanheri Caves.');
end $$;
