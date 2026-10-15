import { AssetsBoard } from "@/components/studio/assets-board";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const session = await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  const query = await searchParams;
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name").eq("org_id", session.org?.orgId ?? "").order("name");
  const site = (sites.data ?? []).find((item) => item.slug === query.site) ?? sites.data?.[0];
  if (!site) return <p className="p-8">No sites in this organisation.</p>;
  const assets = await supabase.from("assets").select("id, site_id, filename, kind, bytes").eq("site_id", site.id).order("created_at", { ascending: false });
  const ids = (assets.data ?? []).map((asset) => asset.id);
  const [elements, evidence, steps] = ids.length
    ? await Promise.all([
        supabase.from("elements").select("model_asset_id").in("model_asset_id", ids),
        supabase.from("evidence").select("asset_id").in("asset_id", ids),
        supabase.from("story_steps").select("audio_asset_id").in("audio_asset_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const used = new Set<string>([
    ...(elements.data ?? []).map((row) => row.model_asset_id as string),
    ...(evidence.data ?? []).map((row) => row.asset_id as string),
    ...(steps.data ?? []).map((row) => row.audio_asset_id as string),
  ]);
  return (
    <AssetsBoard
      siteId={site.id}
      slug={site.slug}
      assets={(assets.data ?? []).map((asset) => ({
        id: asset.id,
        siteId: asset.site_id,
        filename: asset.filename,
        kind: asset.kind,
        bytes: asset.bytes ?? 0,
        referenced: used.has(asset.id),
      }))}
    />
  );
}
