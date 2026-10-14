-- Recent studio activity for a site. security_invoker keeps membership policies in force.

create view public.activity
with (security_invoker = true) as
select
  v.id::text as id,
  v.site_id,
  'version'::text as kind,
  p.name as actor_name,
  p.initials,
  p.name || ' published version ' || v.number as body,
  v.published_at as at
from public.versions v
join public.profiles p on p.id = v.published_by
union all
select
  r.id::text,
  r.site_id,
  'review'::text,
  coalesce(decider.name, submitter.name),
  coalesce(decider.initials, submitter.initials),
  case r.status
    when 'approved' then coalesce(decider.name, submitter.name) || ' approved the review'
    when 'changes_requested' then coalesce(decider.name, submitter.name) || ' requested changes'
    else submitter.name || ' submitted a review'
  end,
  coalesce(r.decided_at, r.submitted_at)
from public.reviews r
join public.profiles submitter on submitter.id = r.submitted_by
left join public.profiles decider on decider.id = r.decided_by
union all
select
  e.id::text,
  e.site_id,
  'evidence'::text,
  p.name,
  p.initials,
  coalesce(p.name, 'Someone') || ' added source ''' || e.title || '''',
  e.created_at
from public.evidence e
left join public.profiles p on p.id = e.added_by
union all
select
  c.id::text,
  c.site_id,
  'comment'::text,
  p.name,
  p.initials,
  p.name || ' commented',
  c.created_at
from public.comments c
join public.profiles p on p.id = c.author;

grant select on public.activity to authenticated;
