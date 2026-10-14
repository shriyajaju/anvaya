-- Items that need a person's attention on a site.
-- security_invoker so element, comment, and membership policies still apply.

create view public.attention
with (security_invoker = true) as
select
  e.site_id,
  e.id as target_id,
  'no_evidence'::text as kind,
  e.name || ' has no evidence linked' as title,
  s.name || ' · Evidence' as meta,
  'evidence'::text as step,
  'low'::text as level
from public.elements e
join public.sites s on s.id = e.site_id
where e.kind <> 'group'
  and not exists (
    select 1
    from public.element_evidence ee
    where ee.element_id = e.id
  )
union all
select
  e.site_id,
  e.id,
  'no_rationale'::text,
  'Confidence rationale missing — ' || e.name,
  'Reconstruct'::text,
  'reconstruct'::text,
  'medium'::text
from public.elements e
where e.kind <> 'group'
  and nullif(btrim(e.rationale), '') is null
  and exists (
    select 1
    from public.element_evidence ee
    where ee.element_id = e.id
  )
union all
select
  c.site_id,
  c.target_id,
  'review_comment'::text,
  'Reviewer comment: ‘' || c.body || '’',
  'Review · ' || coalesce(el.name, 'Site'),
  'review'::text,
  'review'::text
from public.comments c
join public.sites s on s.id = c.site_id
join public.org_members m
  on m.org_id = s.org_id
 and m.user_id = c.author
 and m.role = 'reviewer'
left join public.elements el on el.id = c.target_id
where c.resolved = false
  and c.parent_id is null;

grant select on public.attention to authenticated;
