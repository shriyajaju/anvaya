import { CompareSplit } from "@/components/visitor/compare-split";
import { TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ComparePage({
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
  const remains = snap.elements.find((item) => item.kind === "group" && item.modelUrl);
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="compare" elementId={element.id} />
      <TopNav back={`/${slug}/ar/${element.id}${visitorQuery(query)}`} title="Then / Now" />
      <h1 className="mb-4 font-visitor text-[28px] leading-[34px]">{element.name}</h1>
      <CompareSplit thenSrc={element.modelUrl} nowSrc={remains?.modelUrl ?? element.modelUrl} label={element.name} />
      <p className="mt-3 text-[13px] leading-5 text-text-3">Drag the handle to compare the reconstruction with what remains. This does not align the model to the ruin.</p>
    </main>
  );
}
