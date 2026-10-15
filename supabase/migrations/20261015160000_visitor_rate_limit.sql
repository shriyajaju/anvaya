create table if not exists private.visitor_insert_budget (
  session_id text not null,
  hour timestamptz not null,
  n integer not null default 0,
  primary key (session_id, hour)
);

create or replace function public.visitor_insert_allowed(p_session text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_n integer;
begin
  if p_session is null or length(p_session) < 4 or length(p_session) > 80 then
    return false;
  end if;
  insert into private.visitor_insert_budget (session_id, hour, n)
  values (p_session, date_trunc('hour', now()), 1)
  on conflict (session_id, hour)
  do update set n = private.visitor_insert_budget.n + 1
  returning n into v_n;
  return v_n <= 40;
end;
$$;

revoke all on function public.visitor_insert_allowed(text) from public;
grant execute on function public.visitor_insert_allowed(text) to service_role;
