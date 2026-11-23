import { ReconstructionScreen } from "@/components/visitor/reconstruction-screen";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { isImageReconstruction } from "@/lib/reconstruction/mode";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { ArScreen } from "@/components/visitor/ar-screen";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function ArPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; el: string }>;
  searchParams: Promise<{ v?: string; preview?: string; camera?: string }>;
}) {
  const { slug, el } = await params;
  const query = await searchParams;
  const snap = await getSnapshot(slug, query.v, query.preview);
  const element = snap?.elements.find((item) => item.id === el);
  if (!snap || !element) notFound();
  const location = snap.locations.find((item) => item.primaryElementId === element.id);
  const group = snap.elements.find((item) => item.id === element.parentId);
  const suffix = visitorQuery(query);
  const back = location ? `/${slug}/l/${location.code}${suffix}` : `/${slug}/plan${suffix}`;
  const title = group ? `${group.name}${snap.site.year ? ` · ${snap.site.year} CE` : ""}` : element.name;

  if (!isImageReconstruction()) {
    return (
      <>
        <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="ar" elementId={element.id} />
        <ArScreen
          slug={slug}
          back={back}
          title={title}
          elementId={element.id}
          elementName={element.name}
          year={snap.site.year}
          level={element.confidence}
          modelUrl={element.modelUrl}
        />
      </>
    );
  }

  const reconstruction = snap.reconstruction;
  const regions = (reconstruction?.regions ?? []).map((region) => {
    const target = snap.elements.find((item) => item.id === region.elementId);
    return {
      id: region.id,
      elementId: region.elementId,
      shape: region.shape,
      confidence: target?.confidence ?? ("low" as const),
      name: target?.name ?? "Element",
    };
  });

  return (
    <>
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="ar" elementId={element.id} />
      <ReconstructionScreen
        slug={slug}
        back={back}
        title={title}
        elementId={element.id}
        elementName={element.name}
        year={snap.site.year}
        level={element.confidence}
        sourcePhotoUrl={
          reconstruction?.sourcePhotoUrl ?? "/seed-reconstructions/ajanta-cave-1/source-photo.jpg"
        }
        reconstructionUrl={reconstruction?.imageUrl ?? null}
        edgeGuideUrl={reconstruction?.edgeGuideUrl ?? null}
        wireframeUrl={reconstruction?.wireframeUrl ?? null}
        origin={reconstruction?.origin ?? null}
        regions={regions}
        label={
          reconstruction?.origin === "uploaded"
            ? "Imagined reconstruction"
            : "AI-assisted, imagined reconstruction"
        }
        viewpointLabel={reconstruction?.viewpointLabel ?? null}
        viewpointNote={reconstruction?.viewpointNote ?? null}
        siteId={snap.site.id}
        sourcePhotoId={reconstruction?.sourcePhotoId ?? null}
        reconstructionId={reconstruction?.id ?? null}
        startCamera={query.camera === "1" || query.camera === "true"}
      />
    </>
  );
}
