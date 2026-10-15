import { TopNav } from "@/components/visitor/parts";
import { VisitBeacon } from "@/components/visitor/visit-beacon";
import { visitorQuery } from "@/lib/visitor/types";
import { getSnapshot } from "@/server/visitor";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function StoriesPage({
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
  const suffix = visitorQuery(query);
  return (
    <main className="min-h-screen px-6 pb-10 pt-[110px]">
      <VisitBeacon siteId={snap.site.id} versionId={snap.versionId} type="stories" />
      <TopNav back={`/${slug}${suffix}`} title="Stories" />
      <h1 className="font-visitor text-[28px] leading-[34px]">Stories</h1>
      <ul className="mt-4 flex flex-col gap-2">
        {snap.stories.map((story) => {
          const step = story.steps[0];
          return (
            <li key={story.id}>
              <Link href={step ? `/${slug}/story/${story.id}/${step.id}${suffix}` : `/${slug}/stories`} className="block rounded-card bg-surface px-4 py-3">
                <p className="text-[15px] leading-6">{story.title}</p>
                <p className="text-[13px] text-text-2">{story.steps.length} locations · {Math.max(1, Math.round(story.durationS / 60))} min</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
