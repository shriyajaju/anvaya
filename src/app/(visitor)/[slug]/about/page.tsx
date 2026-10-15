import { Rating } from "@/components/visitor/rating";
import { TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorLabel, visitorQuery, type VisitorLevel } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function AboutPage({
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
  const counts = { high: 0, medium: 0, low: 0 };
  for (const element of snap.elements) {
    if (element.kind === "group") continue;
    counts[element.confidence] += 1;
  }
  const total = Math.max(1, counts.high + counts.medium + counts.low);
  return (
    <main className="flex min-h-screen flex-col gap-4 px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="about" />
      <TopNav back={`/${slug}${visitorQuery(query)}`} title="About" />
      <h1 className="font-visitor text-[28px] leading-[34px]">{snap.site.name}</h1>
      <p className="text-[15px] leading-6">{snap.site.description}</p>
      <p className="text-[13px] leading-5 text-text-2">{snap.site.location}{snap.site.year ? ` · c. ${snap.site.year} CE` : ""}</p>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">How this was made</h2>
      <p className="text-[15px] leading-6">Each reconstruction is labelled by how well the evidence supports it. Nothing here is presented as fact.</p>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Confidence</h2>
      {(["high", "medium", "low"] as VisitorLevel[]).map((level) => (
        <div key={level}>
          <p className="mb-1 text-[13px] text-text-2">{visitorLabel(level)} · {counts[level]}</p>
          <div className="h-2 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${(counts[level] / total) * 100}%` }} />
          </div>
        </div>
      ))}
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Preserved</h2>
      <p className="rounded-card bg-surface px-3 py-2 text-[13px] leading-5 text-text-2">
        Version {snap.versionNumber ?? "working copy"} is kept as a snapshot{snap.site.managedBy ? ` by ${snap.site.managedBy}` : ""}.
      </p>
      {snap.settings.collectFeedback ? <Rating siteId={snap.site.id} versionId={snap.versionId} /> : null}
    </main>
  );
}
