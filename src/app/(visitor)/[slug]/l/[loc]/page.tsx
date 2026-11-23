import { ConfidenceChip, TopNav, VButton } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { placeName, visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; loc: string }>;
  searchParams: Promise<{ v?: string; preview?: string }>;
}) {
  const { slug, loc } = await params;
  const query = await searchParams;
  const snap = await getSnapshot(slug, query.v, query.preview);
  if (!snap) notFound();
  const location = snap.locations.find((item) => item.code === loc);
  if (!location) notFound();
  const element = snap.elements.find((item) => item.id === location.primaryElementId) ?? snap.elements.find((item) => item.kind !== "group");
  const suffix = visitorQuery(query);
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="location" locationId={location.id} />
      <TopNav back={`/${slug}/plan${suffix}`} title={placeName(location.name)} />
      <h1 className="font-visitor text-[28px] leading-[34px]">{placeName(location.name)}</h1>
      <p className="mt-2 text-[15px] leading-6 text-text-2">{snap.site.location}</p>
      {element ? (
        <div className="mt-6 flex flex-col gap-4">
          <ConfidenceChip level={element.confidence} href={`/${slug}/hdwk/${element.id}${suffix}`} />
          <p className="text-[15px] leading-6">{element.name}</p>
          <VButton href={`/${slug}/ar/${element.id}${suffix}`}>See the reconstruction</VButton>
          {element.kind === "group"
            ? snap.elements
                .filter((item) => item.parentId === element.id && item.visible)
                .map((item) => (
                  <a key={item.id} href={`/${slug}/ar/${item.id}${suffix}`} className="text-[15px] underline">
                    {item.name}
                  </a>
                ))
            : null}
        </div>
      ) : null}
    </main>
  );
}
