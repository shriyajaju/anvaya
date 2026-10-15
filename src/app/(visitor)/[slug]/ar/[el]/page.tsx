import { ArScreen } from "@/components/visitor/ar-screen";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ArPage({
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
  const location = snap.locations.find((item) => item.primaryElementId === element.id);
  const group = snap.elements.find((item) => item.id === element.parentId);
  const suffix = visitorQuery(query);
  return (
    <>
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="ar" elementId={element.id} />
      <ArScreen
        slug={slug}
        back={location ? `/${slug}/l/${location.code}${suffix}` : `/${slug}/plan${suffix}`}
        title={group ? `${group.name}${snap.site.year ? ` · ${snap.site.year} CE` : ""}` : element.name}
        elementId={element.id}
        elementName={element.name}
        year={snap.site.year}
        level={element.confidence}
        modelUrl={element.modelUrl}
      />
    </>
  );
}
