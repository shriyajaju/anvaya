import { SourceRow, TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function SourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; el: string }>;
  searchParams: Promise<{ v?: string; preview?: string }>;
}) {
  const { slug, el } = await params;
  const query = await searchParams;
  const snap = await getSnapshot(slug, query.v, query.preview);
  const element = snap?.elements.find((item) => item.id === el);
  if (!snap || !element) notFound();
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="sources" elementId={element.id} />
      <TopNav back={`/${slug}/hdwk/${element.id}${visitorQuery(query)}`} title="Sources" />
      <h1 className="font-visitor text-[28px] leading-[34px]">{element.name}</h1>
      <div className="mt-4 flex flex-col gap-2">
        {element.evidence.length === 0 ? (
          <p className="rounded-card bg-conf-low-bg px-3 py-2 text-[15px] leading-6 text-conf-low">No evidence linked yet. Treat this as a hypothesis.</p>
        ) : (
          element.evidence.map((item) => <SourceRow key={item.id} title={item.title} citation={item.citation} />)
        )}
      </div>
    </main>
  );
}
