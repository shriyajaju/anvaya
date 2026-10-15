create or replace view public.analytics_sessions
with (security_invoker = true) as
select site_id, session_id, min(at) as started_at, count(*)::int as events
from public.analytics_events
group by site_id, session_id;

create or replace view public.analytics_scans_by_location
with (security_invoker = true) as
select site_id, location_id, count(*)::int as scans
from public.analytics_events
where type = 'scan'
group by site_id, location_id;

create or replace view public.analytics_ar_opens
with (security_invoker = true) as
select site_id, count(*)::int as opens
from public.analytics_events
where type = 'ar'
group by site_id;

create or replace view public.analytics_hdwk
with (security_invoker = true) as
select site_id,
  count(*) filter (where type = 'hdwk')::int as opens,
  count(distinct session_id) filter (where type = 'hdwk')::int as sessions_opened,
  count(distinct session_id)::int as sessions
from public.analytics_events
group by site_id;

create or replace view public.analytics_most_viewed
with (security_invoker = true) as
select site_id, element_id, count(*)::int as views
from public.analytics_events
where element_id is not null
  and type in ('ar', 'hdwk', 'compare', 'sources')
group by site_id, element_id;

create or replace view public.analytics_feedback_averages
with (security_invoker = true) as
select site_id,
  count(*)::int as responses,
  round(avg(understand)::numeric, 1) as understand_avg,
  round(avg(trust)::numeric, 1) as trust_avg
from public.feedback
group by site_id;

grant select on public.analytics_sessions, public.analytics_scans_by_location, public.analytics_ar_opens, public.analytics_hdwk, public.analytics_most_viewed, public.analytics_feedback_averages to authenticated;
