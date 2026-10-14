import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SceneTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

export type SceneElement = {
  id: string;
  name: string;
  kind: "group" | "structure" | "architectural" | "object";
  parentId: string | null;
  confidence: "high" | "medium" | "low";
  rationale: string;
  assumptions: string[];
  visible: boolean;
  transform: SceneTransform | null;
  modelUrl: string | null;
  sources: { id: string; title: string; kind: string; dateLabel: string | null }[];
};

export type ReconstructData = {
  siteId: string;
  slug: string;
  year: number | null;
  periods: { id: string; name: string }[];
  elements: SceneElement[];
  sources: { id: string; title: string; kind: string }[];
  previewToken: string;
};

function asTransform(value: unknown): SceneTransform | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<SceneTransform>;
  if (!Array.isArray(row.position) || !Array.isArray(row.rotation) || !Array.isArray(row.scale)) return null;
  return {
    position: row.position as [number, number, number],
    rotation: row.rotation as [number, number, number],
    scale: row.scale as [number, number, number],
  };
}

export async function reconstructForSite(siteId: string, slug: string, previewToken: string): Promise<ReconstructData> {
  const supabase = await createClient();
  const [site, elements, assets, evidence, links, periods] = await Promise.all([
    supabase.from("sites").select("reconstruction_year").eq("id", siteId).single(),
    supabase
      .from("elements")
      .select("id, name, kind, parent_id, confidence, rationale, assumptions, visible, transform, model_asset_id, sort")
      .eq("site_id", siteId)
      .order("sort"),
    supabase.from("assets").select("id, storage_path, filename").eq("site_id", siteId).eq("kind", "model"),
    supabase.from("evidence").select("id, title, kind, date_label").eq("site_id", siteId),
    supabase.from("element_evidence").select("element_id, evidence_id"),
    supabase.from("periods").select("id, name, sort").eq("site_id", siteId).order("sort"),
  ]);
  for (const result of [site, elements, assets, evidence, links, periods]) {
    if (result.error) throw new Error(result.error.message);
  }

  const models = new Map<string, string>();
  await Promise.all(
    (assets.data ?? []).map(async (asset) => {
      if (asset.storage_path.startsWith("seed-models/")) {
        models.set(asset.id, `/${asset.storage_path}`);
        return;
      }
      const signed = await supabase.storage.from("assets").createSignedUrl(asset.storage_path, 60 * 60);
      if (signed.data?.signedUrl) models.set(asset.id, signed.data.signedUrl);
    }),
  );

  const sourceRows = evidence.data ?? [];
  const linkRows = links.data ?? [];

  return {
    siteId,
    slug,
    year: site.data?.reconstruction_year ?? null,
    periods: (periods.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    previewToken,
    sources: sourceRows.map((row) => ({ id: row.id, title: row.title, kind: row.kind })),
    elements: (elements.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      parentId: row.parent_id,
      confidence: row.confidence,
      rationale: row.rationale ?? "",
      assumptions: row.assumptions ?? [],
      visible: row.visible,
      transform: asTransform(row.transform),
      modelUrl: row.model_asset_id ? models.get(row.model_asset_id) ?? null : null,
      sources: linkRows
        .filter((link) => link.element_id === row.id)
        .map((link) => sourceRows.find((source) => source.id === link.evidence_id))
        .filter((source): source is NonNullable<typeof source> => Boolean(source))
        .map((source) => ({ id: source.id, title: source.title, kind: source.kind, dateLabel: source.date_label })),
    })),
  };
}
