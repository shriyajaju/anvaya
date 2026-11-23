import { AssetsBoard } from "@/components/studio/assets-board";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const session = await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  const query = await searchParams;
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name").eq("org_id", session.org?.orgId ?? "").order("name");
  const rows = sites.data ?? [];
  const site = rows.find((item) => item.slug === query.site) ?? rows[0];
  if (!site) return <p className="p-8">No sites in this organisation.</p>;
  const ids = rows.map((item) => item.id);
  const assets = ids.length
    ? await supabase.from("assets").select("id, site_id, filename, kind, bytes, created_at, storage_path").in("site_id", ids).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (assets.error) throw new Error(assets.error.message);
  const assetIds = (assets.data ?? []).map((asset) => asset.id);
  const [elements, evidence, steps] = assetIds.length
    ? await Promise.all([
        supabase.from("elements").select("model_asset_id").in("model_asset_id", assetIds),
        supabase.from("evidence").select("asset_id").in("asset_id", assetIds),
        supabase.from("story_steps").select("audio_asset_id").in("audio_asset_id", assetIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const used = new Set<string>([
    ...(elements.data ?? []).map((row) => row.model_asset_id as string),
    ...(evidence.data ?? []).map((row) => row.asset_id as string),
    ...(steps.data ?? []).map((row) => row.audio_asset_id as string),
  ]);
  const siteName = new Map(rows.map((item) => [item.id, item]));
  const cards = await Promise.all(
    (assets.data ?? []).map(async (asset) => {
      const owner = siteName.get(asset.site_id as string);
      let downloadUrl: string | null = null;
      if (asset.storage_path && asset.kind === "photo") {
        const signed = await supabase.storage.from("assets").createSignedUrl(asset.storage_path as string, 60 * 60);
        downloadUrl = signed.data?.signedUrl ?? null;
      }
      return {
        id: asset.id as string,
        siteId: asset.site_id as string,
        siteName: (owner?.name as string) ?? "Site",
        siteSlug: (owner?.slug as string) ?? "",
        filename: asset.filename as string,
        kind: asset.kind as string,
        bytes: (asset.bytes as number | null) ?? 0,
        createdAt: asset.created_at as string,
        referenced: used.has(asset.id as string),
        downloadUrl,
      };
    }),
  );
  return <AssetsBoard siteId={site.id} slug={site.slug} sites={rows.map((item) => ({ id: item.id, name: item.name, slug: item.slug }))} assets={cards} />;
}
