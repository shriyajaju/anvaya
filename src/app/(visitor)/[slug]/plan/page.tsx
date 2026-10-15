import { GlassPill, TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { placeName, visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const snap = await getSnapshot(slug, query.v, query.preview);
  if (!snap) notFound();
  const suffix = visitorQuery(query);
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="plan" />
      <TopNav back={`/${slug}${suffix}`} title="Plan" />
      <h1 className="font-visitor text-[28px] leading-[34px]">{snap.site.name}</h1>
      <p className="mt-2 text-[13px] leading-5 text-text-2">Choose a place on the site.</p>
      <ul className="mt-6 flex flex-col gap-2">
        {snap.locations.map((location) => (
          <li key={location.id}>
            <Link href={`/${slug}/l/${location.code}${suffix}`} className="flex items-center justify-between rounded-card bg-surface px-4 py-3">
              <span>{placeName(location.name)}</span>
              <GlassPill>{location.code}</GlassPill>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
