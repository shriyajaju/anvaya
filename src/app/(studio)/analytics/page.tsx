import { AnalyticsBoard } from "@/components/studio/analytics-board";
import { requireRole } from "@/lib/auth/session";
import { loadAnalytics } from "@/server/analytics-data";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  const query = await searchParams;
  const data = await loadAnalytics(query.site, query.range);
  if (!data) return <p className="p-8 text-text-2">No sites in this organisation.</p>;
  const slug = data.sites.find((item) => item.id === data.siteId)?.slug ?? "";
  return <AnalyticsBoard data={data} slug={slug} range={query.range ?? "all"} />;
}
