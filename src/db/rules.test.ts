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

async function asUser<T>(
  tx: postgres.TransactionSql,
  userId: string,
  run: () => Promise<T>,
): Promise<T> {
  await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
  return run();
}

describe("database rules", () => {
  beforeAll(async () => {
    const [{ ok }] = await sql<{ ok: number }[]>`
      select 1 as ok from public.sites where slug = 'kanheri'
    `;
    expect(ok).toBe(1);
  });

  afterAll(async () => {
    await sql.end();
  });

  async function withFixture(
    run: (tx: postgres.TransactionSql, ids: Fixture) => Promise<void>,
  ) {
    const ids = {
      creator: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
      reviewer: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
      admin: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
      org: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0010",
      site: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0020",
    };

    await expect(
      sql.begin(async (tx) => {
        await tx`
          insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
          values
            ('00000000-0000-0000-0000-000000000000', ${ids.creator}::uuid, 'authenticated', 'authenticated', ${`${ids.creator}@anvaya.test`}, now(), now()),
            ('00000000-0000-0000-0000-000000000000', ${ids.reviewer}::uuid, 'authenticated', 'authenticated', ${`${ids.reviewer}@anvaya.test`}, now(), now()),
            ('00000000-0000-0000-0000-000000000000', ${ids.admin}::uuid, 'authenticated', 'authenticated', ${`${ids.admin}@anvaya.test`}, now(), now())
        `;
        await tx`
          insert into public.profiles (id, name, initials)
          values
            (${ids.creator}::uuid, 'Test creator', 'TC'),
            (${ids.reviewer}::uuid, 'Test reviewer', 'TR'),
            (${ids.admin}::uuid, 'Test admin', 'TA')
        `;
        await tx`
          insert into public.organisations (id, name, slug)
          values (${ids.org}::uuid, 'Rules org', ${`rules-${ids.org}`})
        `;
        await tx`
          insert into public.org_members (org_id, user_id, role)
          values
            (${ids.org}::uuid, ${ids.creator}::uuid, 'creator'),
            (${ids.org}::uuid, ${ids.reviewer}::uuid, 'reviewer'),
            (${ids.org}::uuid, ${ids.admin}::uuid, 'admin')
        `;
        await tx`
          insert into public.sites (id, org_id, slug, name, created_by, require_review)
          values (
            ${ids.site}::uuid,
            ${ids.org}::uuid,
            ${`rules-${ids.site}`},
            'Rules site',
            ${ids.creator}::uuid,
            true
          )
        `;
        await run(tx, ids);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  }

  it("refuses high confidence with no evidence, then accepts it after a link", async () => {
    await withFixture(async (tx, ids) => {
      const [{ id: elementId }] = await tx<{ id: string }[]>`
        insert into public.elements (site_id, name, kind, confidence)
        values (${ids.site}::uuid, 'Water cistern', 'object', 'low')
        returning id
      `;

      await expect(
        tx.savepoint(async (sp) => {
          await sp`
            update public.elements
            set confidence = 'high'
            where id = ${elementId}::uuid
          `;
        }),
      ).rejects.toThrow(/HIGH_NEEDS_EVIDENCE/);

      const [{ confidence }] = await tx<{ confidence: string }[]>`
        select confidence::text as confidence
        from public.elements
        where id = ${elementId}::uuid
      `;
      expect(confidence).toBe("low");

      const [{ id: evidenceId }] = await tx<{ id: string }[]>`
        insert into public.evidence (site_id, kind, title, citation, strength, added_by)
        values (
          ${ids.site}::uuid,
          'physical',
          'Placeholder survey',
          'Placeholder survey (placeholder reference)',
          'high',
          ${ids.creator}::uuid
        )
        returning id
      `;
      await tx`
        insert into public.element_evidence (element_id, evidence_id)
        values (${elementId}::uuid, ${evidenceId}::uuid)
      `;
      await tx`
        update public.elements
        set confidence = 'high'
        where id = ${elementId}::uuid
      `;

      const [{ confidence: after }] = await tx<{ confidence: string }[]>`
        select confidence::text as confidence
        from public.elements
        where id = ${elementId}::uuid
      `;
      expect(after).toBe("high");
    });
  });

  it("does not let a creator approve their own review", async () => {
    await withFixture(async (tx, ids) => {
      const [{ id: reviewId }] = await tx<{ id: string }[]>`
        insert into public.reviews (site_id, status, submitted_by, content_sig)
        values (${ids.site}::uuid, 'open', ${ids.creator}::uuid, public.content_sig(${ids.site}::uuid))
        returning id
      `;

      const [{ ok: creator }] = await asUser(tx, ids.creator, () => tx<{ ok: boolean }[]>`
        select public.can_approve(${reviewId}::uuid) as ok
      `);
      expect(creator).toBe(false);

      const [{ ok: reviewer }] = await asUser(tx, ids.reviewer, () => tx<{ ok: boolean }[]>`
        select public.can_approve(${reviewId}::uuid) as ok
      `);
      expect(reviewer).toBe(true);
    });
  });

  it("refuses publish when the review signature does not match the working copy", async () => {
    await withFixture(async (tx, ids) => {
      await tx`
        insert into public.reviews (site_id, status, submitted_by, decided_by, decided_at, content_sig)
        values (
          ${ids.site}::uuid,
          'approved',
          ${ids.creator}::uuid,
          ${ids.admin}::uuid,
          now(),
          'stale-signature'
        )
      `;

      const [{ ok }] = await asUser(tx, ids.admin, () => tx<{ ok: boolean }[]>`
        select public.can_publish(${ids.site}::uuid) as ok
      `);
      expect(ok).toBe(false);

      await tx`
        update public.reviews
        set content_sig = public.content_sig(${ids.site}::uuid)
        where site_id = ${ids.site}::uuid
      `;
      const [{ ok: matched }] = await asUser(tx, ids.admin, () => tx<{ ok: boolean }[]>`
        select public.can_publish(${ids.site}::uuid) as ok
      `);
      expect(matched).toBe(true);
    });
  });

  it("reports a confidence change from low to medium", async () => {
    await withFixture(async (tx, ids) => {
      const elementId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0056";
      const base = {
        site: { id: ids.site, name: "Rules site" },
        settings: {},
        periods: [],
        events: [],
        locations: [],
        stories: [],
        counts: {},
      };
      const [{ id: lowId }] = await tx<{ id: string }[]>`
        insert into public.versions (site_id, number, note, published_by, snapshot, checksum)
        values (
          ${ids.site}::uuid,
          '0.1',
          'low',
          ${ids.admin}::uuid,
          ${tx.json({
            ...base,
            elements: [{ id: elementId, name: "Water cistern", confidence: "low", evidence: [] }],
          })},
          'low'
        )
        returning id
      `;
      const [{ id: mediumId }] = await tx<{ id: string }[]>`
        insert into public.versions (site_id, number, note, published_by, snapshot, checksum)
        values (
          ${ids.site}::uuid,
          '0.2',
          'medium',
          ${ids.admin}::uuid,
          ${tx.json({
            ...base,
            elements: [{ id: elementId, name: "Water cistern", confidence: "medium", evidence: [] }],
          })},
          'medium'
        )
        returning id
      `;

      const [{ diff }] = await tx<{ diff: Array<Record<string, string>> }[]>`
        select public.diff_versions(${lowId}::uuid, ${mediumId}::uuid) as diff
      `;
      expect(diff).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "confidence_changed",
            from: "low",
            to: "medium",
            element_id: elementId,
          }),
        ]),
      );
    });
  });
});

type Fixture = {
  creator: string;
  reviewer: string;
  admin: string;
  org: string;
  site: string;
};
