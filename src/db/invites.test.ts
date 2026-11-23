import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

class Rollback extends Error {
  constructor() {
    super("rollback");
    this.name = "Rollback";
  }
}

describe("pending invites", () => {
  beforeAll(async () => {
    const [{ ok }] = await sql<{ ok: number }[]>`select 1 as ok from public.sites where slug = 'ajanta-cave-1'`;
    expect(ok).toBe(1);
  });

  afterAll(async () => {
    await sql.end();
  });

  it("turns a matching invite into a membership and leaves other invites alone", async () => {
    const invitee = "cccccccc-cccc-4ccc-8ccc-cccccccc0001";
    const owner = "cccccccc-cccc-4ccc-8ccc-cccccccc0002";
    const org = "cccccccc-cccc-4ccc-8ccc-cccccccc0010";
    const otherOrg = "cccccccc-cccc-4ccc-8ccc-cccccccc0011";

    await expect(
      sql.begin(async (tx) => {
        await tx`
          insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
          values
            ('00000000-0000-0000-0000-000000000000', ${invitee}::uuid, 'authenticated', 'authenticated', 'invitee@anvaya.test', now(), now()),
            ('00000000-0000-0000-0000-000000000000', ${owner}::uuid, 'authenticated', 'authenticated', 'owner@anvaya.test', now(), now())
        `;
        await tx`
          insert into public.profiles (id, name, initials)
          values
            (${invitee}::uuid, 'Invitee', 'IN'),
            (${owner}::uuid, 'Owner', 'OW')
        `;
        await tx`
          insert into public.organisations (id, name, slug)
          values
            (${org}::uuid, 'Invite org', 'invite-org'),
            (${otherOrg}::uuid, 'Other org', 'other-org')
        `;
        await tx`
          insert into public.org_members (org_id, user_id, role)
          values (${org}::uuid, ${owner}::uuid, 'owner')
        `;
        await tx`
          insert into public.org_invites (org_id, email, role, invited_by)
          values
            (${org}::uuid, 'invitee@anvaya.test', 'reviewer', ${owner}::uuid),
            (${otherOrg}::uuid, 'someone-else@anvaya.test', 'viewer', ${owner}::uuid)
        `;

        await tx`select set_config('request.jwt.claim.sub', ${invitee}, true)`;
        const [{ accepted }] = await tx<{ accepted: number }[]>`
          select public.accept_pending_invites() as accepted
        `;
        expect(accepted).toBe(1);

        const memberships = await tx<{ role: string }[]>`
          select role::text as role
          from public.org_members
          where org_id = ${org}::uuid and user_id = ${invitee}::uuid
        `;
        expect(memberships).toEqual([{ role: "reviewer" }]);

        const remaining = await tx<{ email: string }[]>`
          select email from public.org_invites order by email
        `;
        expect(remaining).toEqual([{ email: "someone-else@anvaya.test" }]);

        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  });
});
