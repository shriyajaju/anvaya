import postgres from "postgres";

export default async function globalSetup() {
  const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres", { max: 1 });
  const site = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0020";
  const cistern = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0056";
  await sql`delete from public.feedback where site_id = ${site}::uuid`;
  await sql`delete from public.analytics_events where site_id = ${site}::uuid`;
  await sql`update public.elements set confidence = 'low' where id = ${cistern}::uuid`;
  await sql`delete from public.element_evidence where element_id = ${cistern}::uuid`;
  await sql`delete from public.review_items where review_id in (select id from public.reviews where site_id = ${site}::uuid and id <> (select id from public.reviews where site_id = ${site}::uuid order by submitted_at asc limit 1))`;
  await sql`delete from public.comments where site_id = ${site}::uuid and target_type = 'review_item'`;
  await sql`delete from public.reviews where site_id = ${site}::uuid and id <> (select id from public.reviews where site_id = ${site}::uuid order by submitted_at asc limit 1)`;
  await sql`alter table public.versions disable trigger versions_immutable`;
  await sql`delete from public.versions where site_id = ${site}::uuid and number <> '1.0'`;
  await sql`alter table public.versions enable trigger versions_immutable`;
  await sql`
    update public.sites
    set status = 'published',
        current_version_id = (select id from public.versions where site_id = ${site}::uuid and number = '1.0')
    where id = ${site}::uuid
  `;
  await sql.end();
}
