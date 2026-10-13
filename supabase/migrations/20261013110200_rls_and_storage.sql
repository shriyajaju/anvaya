-- ANVAYA §5 row level security and storage buckets.

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.org_members enable row level security;
alter table public.sites enable row level security;
alter table public.periods enable row level security;
alter table public.events enable row level security;
alter table public.assets enable row level security;
alter table public.elements enable row level security;
alter table public.locations enable row level security;
alter table public.evidence enable row level security;
alter table public.element_evidence enable row level security;
alter table public.questions enable row level security;
alter table public.interpretations enable row level security;
alter table public.comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_steps enable row level security;
alter table public.condition enable row level security;
alter table public.measurements enable row level security;
alter table public.reviews enable row level security;
alter table public.review_items enable row level security;
alter table public.versions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.feedback enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = profiles.id
  )
);

create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy organisations_select on public.organisations
for select to authenticated
using (private.org_role(id) is not null);

create policy organisations_insert on public.organisations
for insert to authenticated
with check ((select auth.uid()) is not null);

create policy organisations_update on public.organisations
for update to authenticated
using (private.org_role(id) in ('admin', 'owner'))
with check (private.org_role(id) in ('admin', 'owner'));

create policy org_members_select on public.org_members
for select to authenticated
using (private.org_role(org_id) is not null);

create policy org_members_insert_admin on public.org_members
for insert to authenticated
with check (private.org_role(org_id) in ('admin', 'owner'));

create policy org_members_bootstrap_owner on public.org_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and not private.org_has_members(org_id)
);

create policy org_members_update on public.org_members
for update to authenticated
using (private.org_role(org_id) in ('admin', 'owner'))
with check (private.org_role(org_id) in ('admin', 'owner'));

create policy org_members_delete on public.org_members
for delete to authenticated
using (private.org_role(org_id) in ('admin', 'owner'));

create policy sites_select on public.sites
for select to authenticated
using (private.site_role(id) is not null);

create policy sites_insert on public.sites
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.org_role(org_id) in ('creator', 'admin', 'owner')
);

create policy sites_update on public.sites
for update to authenticated
using (private.site_role(id) in ('creator', 'admin', 'owner'))
with check (private.site_role(id) in ('creator', 'admin', 'owner'));

create policy sites_delete on public.sites
for delete to authenticated
using (private.site_role(id) in ('admin', 'owner'));

-- Content tables: members read; creators, admins, and owners write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'periods',
    'events',
    'assets',
    'elements',
    'locations',
    'evidence',
    'questions',
    'interpretations',
    'stories',
    'condition',
    'measurements'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.site_role(site_id) is not null)',
      t || '_select',
      t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.site_role(site_id) in (''creator'', ''admin'', ''owner''))',
      t || '_insert',
      t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.site_role(site_id) in (''creator'', ''admin'', ''owner'')) with check (private.site_role(site_id) in (''creator'', ''admin'', ''owner''))',
      t || '_update',
      t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.site_role(site_id) in (''creator'', ''admin'', ''owner''))',
      t || '_delete',
      t
    );
  end loop;
end $$;

create policy comments_select on public.comments
for select to authenticated
using (private.site_role(site_id) is not null);

create policy comments_insert on public.comments
for insert to authenticated
with check (
  author = (select auth.uid())
  and private.site_role(site_id) in ('creator', 'reviewer', 'admin', 'owner')
);

create policy comments_update on public.comments
for update to authenticated
using (private.site_role(site_id) in ('creator', 'reviewer', 'admin', 'owner'))
with check (private.site_role(site_id) in ('creator', 'reviewer', 'admin', 'owner'));

create policy comments_delete on public.comments
for delete to authenticated
using (private.site_role(site_id) in ('creator', 'reviewer', 'admin', 'owner'));

create policy element_evidence_select on public.element_evidence
for select to authenticated
using (
  exists (
    select 1
    from public.elements e
    where e.id = element_evidence.element_id
      and private.site_role(e.site_id) is not null
  )
);

create policy element_evidence_insert on public.element_evidence
for insert to authenticated
with check (
  exists (
    select 1
    from public.elements e
    join public.evidence ev on ev.id = element_evidence.evidence_id
    where e.id = element_evidence.element_id
      and e.site_id = ev.site_id
      and private.site_role(e.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy element_evidence_delete on public.element_evidence
for delete to authenticated
using (
  exists (
    select 1
    from public.elements e
    where e.id = element_evidence.element_id
      and private.site_role(e.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy story_steps_select on public.story_steps
for select to authenticated
using (
  exists (
    select 1
    from public.stories s
    where s.id = story_steps.story_id
      and private.site_role(s.site_id) is not null
  )
);

create policy story_steps_write on public.story_steps
for all to authenticated
using (
  exists (
    select 1
    from public.stories s
    where s.id = story_steps.story_id
      and private.site_role(s.site_id) in ('creator', 'admin', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.stories s
    where s.id = story_steps.story_id
      and private.site_role(s.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy reviews_select on public.reviews
for select to authenticated
using (private.site_role(site_id) is not null);

create policy reviews_insert on public.reviews
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.site_role(site_id) in ('creator', 'admin', 'owner')
);

create policy reviews_update on public.reviews
for update to authenticated
using (
  private.site_role(site_id) in ('reviewer', 'admin', 'owner')
  or (
    private.site_role(site_id) = 'creator'
    and submitted_by = (select auth.uid())
  )
)
with check (
  private.site_role(site_id) in ('reviewer', 'admin', 'owner')
  or (
    private.site_role(site_id) = 'creator'
    and submitted_by = (select auth.uid())
  )
);

create policy reviews_delete on public.reviews
for delete to authenticated
using (private.site_role(site_id) in ('admin', 'owner'));

create policy review_items_select on public.review_items
for select to authenticated
using (
  exists (
    select 1
    from public.reviews r
    where r.id = review_items.review_id
      and private.site_role(r.site_id) is not null
  )
);

create policy review_items_insert on public.review_items
for insert to authenticated
with check (
  exists (
    select 1
    from public.reviews r
    where r.id = review_items.review_id
      and private.site_role(r.site_id) in ('creator', 'admin', 'owner')
  )
);

create policy review_items_update on public.review_items
for update to authenticated
using (
  exists (
    select 1
    from public.reviews r
    where r.id = review_items.review_id
      and (
        private.site_role(r.site_id) in ('reviewer', 'admin', 'owner')
        or (
          private.site_role(r.site_id) = 'creator'
          and r.submitted_by = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.reviews r
    where r.id = review_items.review_id
      and (
        private.site_role(r.site_id) in ('reviewer', 'admin', 'owner')
        or (
          private.site_role(r.site_id) = 'creator'
          and r.submitted_by = (select auth.uid())
        )
      )
  )
);

create policy review_items_delete on public.review_items
for delete to authenticated
using (
  exists (
    select 1
    from public.reviews r
    where r.id = review_items.review_id
      and private.site_role(r.site_id) in ('admin', 'owner')
  )
);

-- Versions are immutable: no update or delete policy. Inserts go through publish_site.
create policy versions_member_read on public.versions
for select to authenticated
using (private.site_role(site_id) is not null);

create policy versions_public_read on public.versions
for select to anon, authenticated
using (
  published_at is not null
  and exists (
    select 1
    from public.sites s
    where s.id = versions.site_id
      and s.status = 'published'
  )
);

create policy analytics_member_read on public.analytics_events
for select to authenticated
using (private.site_role(site_id) is not null);

create policy analytics_public_read on public.analytics_events
for select to anon, authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = analytics_events.site_id
      and s.status = 'published'
  )
);

create policy analytics_public_insert on public.analytics_events
for insert to anon, authenticated
with check (
  exists (
    select 1
    from public.sites s
    where s.id = analytics_events.site_id
      and s.status = 'published'
  )
);

create policy feedback_member_read on public.feedback
for select to authenticated
using (private.site_role(site_id) is not null);

create policy feedback_public_read on public.feedback
for select to anon, authenticated
using (
  exists (
    select 1
    from public.sites s
    where s.id = feedback.site_id
      and s.status = 'published'
  )
);

create policy feedback_public_insert on public.feedback
for insert to anon, authenticated
with check (
  exists (
    select 1
    from public.sites s
    where s.id = feedback.site_id
      and s.status = 'published'
  )
);

revoke insert, update, delete on all tables in schema public from anon;
grant insert on public.analytics_events, public.feedback to anon;
grant select on public.versions, public.analytics_events, public.feedback to anon;
revoke insert, update, delete on public.versions from anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into storage.buckets (id, name, public)
values
  ('assets', 'assets', false),
  ('published', 'published', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

-- Object paths are {site_id}/...
create policy assets_select on storage.objects
for select to authenticated
using (
  bucket_id = 'assets'
  and exists (
    select 1
    from public.sites s
    where s.id::text = (storage.foldername(name))[1]
      and private.site_role(s.id) is not null
  )
);

create policy assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'assets'
  and exists (
    select 1
    from public.sites s
    where s.id::text = (storage.foldername(name))[1]
      and private.site_role(s.id) in ('creator', 'admin', 'owner')
  )
);

create policy assets_update on storage.objects
for update to authenticated
using (
  bucket_id = 'assets'
  and exists (
    select 1
    from public.sites s
    where s.id::text = (storage.foldername(name))[1]
      and private.site_role(s.id) in ('creator', 'admin', 'owner')
  )
)
with check (
  bucket_id = 'assets'
  and exists (
    select 1
    from public.sites s
    where s.id::text = (storage.foldername(name))[1]
      and private.site_role(s.id) in ('creator', 'admin', 'owner')
  )
);

create policy assets_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'assets'
  and exists (
    select 1
    from public.sites s
    where s.id::text = (storage.foldername(name))[1]
      and private.site_role(s.id) in ('creator', 'admin', 'owner')
  )
);

create policy published_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'published');
