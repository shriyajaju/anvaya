import { TopNav } from "@/components/visitor/parts";
import { StoryPlayer } from "@/components/visitor/story-player";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { placeName, visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function StoryStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string; step: string }>;
  searchParams: Promise<{ v?: string; preview?: string }>;
}) {
  const { slug, id, step } = await params;
  const query = await searchParams;
  const snap = await getSnapshot(slug, query.v, query.preview);
  const story = snap?.stories.find((item) => item.id === id);
  const index = story?.steps.findIndex((item) => item.id === step) ?? -1;
  if (!snap || !story || index < 0) notFound();
  const current = story.steps[index];
  const suffix = visitorQuery(query);
  const href = (target: { id: string } | undefined) => (target ? `/${slug}/story/${story.id}/${target.id}${suffix}` : null);
  const location = snap.locations.find((item) => item.id === current.locationId);
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="story" locationId={current.locationId} />
      <TopNav back={`/${slug}/stories${suffix}`} title={story.title} />
      <StoryPlayer
        title={current.title}
        body={current.body}
        audioUrl={current.audioUrl}
        previous={href(story.steps[index - 1])}
        next={href(story.steps[index + 1])}
        location={location ? placeName(location.name) : null}
      />
    </main>
  );
}
