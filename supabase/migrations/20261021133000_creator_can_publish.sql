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
      and (
        (
          s.require_review = false
          and m.role in ('creator', 'admin', 'owner')
        )
        or (
          m.role in ('admin', 'owner')
          and exists (
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
      )
  );
$$;
