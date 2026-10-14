alter table public.organisations
  add column kind text;

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null,
  role public.org_role not null,
  invited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint org_invites_role_check check (role in ('admin', 'creator', 'reviewer', 'viewer')),
  constraint org_invites_email_check check (position('@' in email) > 1)
);

create unique index org_invites_org_email_key on public.org_invites (org_id, lower(email));
create index org_invites_email_idx on public.org_invites (lower(email));

alter table public.org_invites enable row level security;

create policy org_invites_select on public.org_invites
  for select to authenticated
  using (private.org_role(org_id) in ('admin', 'owner'));

create policy org_invites_insert on public.org_invites
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and private.org_role(org_id) in ('admin', 'owner')
  );

create policy org_invites_delete on public.org_invites
  for delete to authenticated
  using (private.org_role(org_id) in ('admin', 'owner'));

revoke all on public.org_invites from anon;
grant select, insert, delete on public.org_invites to authenticated;

create or replace function private.accept_pending_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  select lower(email) into v_email
  from auth.users
  where id = v_uid;

  if v_email is null or v_email = '' then
    return 0;
  end if;

  insert into public.org_members (org_id, user_id, role)
  select i.org_id, v_uid, i.role
  from public.org_invites i
  where lower(i.email) = v_email
  on conflict (org_id, user_id) do nothing;

  delete from public.org_invites
  where lower(email) = v_email;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.accept_pending_invites()
returns integer
language sql
security invoker
set search_path = public
as $$
  select private.accept_pending_invites();
$$;

revoke all on function public.accept_pending_invites() from public;
revoke all on function private.accept_pending_invites() from public;
grant execute on function public.accept_pending_invites() to authenticated;
grant execute on function private.accept_pending_invites() to authenticated;
