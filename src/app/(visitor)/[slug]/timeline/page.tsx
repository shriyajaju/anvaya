import { TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function TimelinePage({
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
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="timeline" />
      <TopNav back={`/${slug}${visitorQuery(query)}`} title="Timeline" />
      <h1 className="font-visitor text-[28px] leading-[34px]">Timeline</h1>
      <ol className="mt-6 border-l border-border pl-4">
        {snap.events.map((event) => (
          <li key={event.id} className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{event.year ?? "Undated"}</p>
            <p className="text-[15px] leading-6">{event.title}</p>
            {event.description ? <p className="text-[13px] leading-5 text-text-2">{event.description}</p> : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
