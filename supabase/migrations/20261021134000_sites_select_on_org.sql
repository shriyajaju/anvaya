drop policy if exists sites_select on public.sites;

create policy sites_select on public.sites
for select to authenticated
using (private.org_role(org_id) is not null);
