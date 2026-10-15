import { Sheet } from "@/components/visitor/ar-controls";
import { AltReading, FactRow, FooterNote, SourceRow, TopNav, VButton } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function HowPage({
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
  const suffix = visitorQuery(query);
  const alternatives = element.interpretations.filter((item) => !item.selected);
  return (
    <main className="relative min-h-screen bg-page">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="hdwk" elementId={element.id} />
      <TopNav back={`/${slug}/ar/${element.id}${suffix}`} title="How do we know?" />
      <Sheet tall>
        <h1 className="font-visitor text-[28px] leading-[34px]">{element.name}</h1>
        {element.rationale ? <p className="text-[15px] leading-6">{element.rationale}</p> : null}
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">What we know</h2>
        {element.evidence.filter((item) => item.note).map((item) => (
          <FactRow key={item.id} kind="know" text={item.note ?? ""} />
        ))}
        {snap.settings.showAssumptions && element.assumptions.length > 0 ? (
          <>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">What we&apos;re assuming</h2>
            {element.assumptions.map((item) => (
              <FactRow key={item} kind="assume" text={item} />
            ))}
          </>
        ) : null}
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Evidence</h2>
        {element.evidence.length === 0 ? (
          <p className="rounded-card bg-conf-low-bg px-3 py-2 text-[15px] leading-6 text-conf-low">No evidence linked yet. Treat this as a hypothesis.</p>
        ) : (
          element.evidence.map((item) => <SourceRow key={item.id} title={item.title} citation={item.citation} />)
        )}
        {snap.settings.showAlternatives && alternatives.length > 0 ? (
          <>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Alternative reading</h2>
            {alternatives.map((item) => (
              <AltReading key={item.id} label={item.label} summary={item.summary} />
            ))}
          </>
        ) : null}
        <VButton href={`/${slug}/sources/${element.id}${suffix}`}>Explore sources</VButton>
        <FooterNote reviewer={snap.reviewerName} version={snap.versionNumber} />
      </Sheet>
    </main>
  );
}
