import { GlassPill, VButton } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { placeName, visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { Info } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ l?: string; v?: string; preview?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (query.preview === "expired") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-6 text-center">
        <h1 className="font-visitor text-[28px] leading-[34px]">Preview link expired</h1>
        <p className="text-[15px] leading-6 text-text-2">Ask the site team for a new preview link. Published versions stay available without one.</p>
      </main>
    );
  }
  const snap = await getSnapshot(slug, query.v, query.preview);
  if (!snap) notFound();
  const location = snap.locations.find((item) => item.code === query.l) ?? snap.locations[0];
  const reconstructions = snap.elements.filter((item) => item.kind !== "group" && item.visible).length;
  const minutes = Math.max(1, Math.round(snap.stories.reduce((sum, story) => sum + story.durationS, 0) / 60));
  const next = query.l ? `/${slug}/l/${query.l}` : `/${slug}/plan`;
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[var(--color-camera-from)] via-[var(--color-camera-to)] via-[70%] to-[var(--color-camera-to)] px-6 pb-6 pt-[54px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="scan" locationId={location?.id ?? null} />
      {snap.preview ? <p className="mb-4 rounded-pill bg-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.08em]">Preview</p> : null}
      <GlassPill>
        {snap.site.name}
        {location ? ` · ${placeName(location.name)}` : ""}
      </GlassPill>
      <section className="mt-[194px] flex w-full max-w-[342px] flex-col gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-glass-text)]">Anvaya</p>
        <h1 className="font-visitor text-[28px] font-normal leading-[34px]">{snap.site.name}</h1>
        <p className="text-[15px] leading-6">See what remains. Discover what once was.</p>
        <div className="flex flex-wrap gap-2">
          <GlassPill>{reconstructions} reconstructions</GlassPill>
          <GlassPill>{snap.stories.length} story</GlassPill>
          <GlassPill>{minutes} min</GlassPill>
        </div>
        <div className="flex gap-2.5 text-[13px] leading-5 text-[var(--color-glass-text)]">
          <Info size={20} className="shrink-0" />
          <p>Reconstructions show how the site may have looked. We tell you how sure we are.</p>
        </div>
        <VButton href={`${next}${visitorQuery(query)}`}>Begin exploring</VButton>
        <p className="text-center text-[13px] text-[var(--color-glass-text)]">Works in your browser · No download</p>
      </section>
    </main>
  );
}
