import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildReconstructionPrompt } from "@/lib/reconstruction/prompt";

export type ReconstructionPhoto = {
  id: string;
  filename: string;
  url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
};

export type ReconstructionElement = {
  id: string;
  name: string;
  kind: string;
  confidence: "high" | "medium" | "low";
  rationale: string;
  assumptions: string[];
  evidenceCount: number;
  evidenceIds: string[];
  evidenceNotes: string[];
};

export type ReconstructionRegion = {
  id: string;
  elementId: string;
  shape: { x: number; y: number }[];
};

export type ReconstructionAttempt = {
  id: string;
  sourcePhotoId: string | null;
  imageUrl: string | null;
  promptText: string | null;
  provider: string | null;
  model: string | null;
  origin: "generated" | "uploaded";
  status: "queued" | "generating" | "done" | "failed";
  error: string | null;
  isCurrent: boolean;
  elementIds: string[];
  createdAt: string;
  regions: ReconstructionRegion[];
};

export type ImageReconstructData = {
  siteId: string;
  slug: string;
  year: number | null;
  siteType: string | null;
  periodAndStyle: string;
  photos: ReconstructionPhoto[];
  elements: ReconstructionElement[];
  evidence: { id: string; title: string; kind: string }[];
  attempts: ReconstructionAttempt[];
  current: ReconstructionAttempt | null;
  previewPrompt: string;
  previewToken: string;
};

export async function imageReconstructForSite(
  siteId: string,
  slug: string,
  previewToken: string,
): Promise<ImageReconstructData> {
  const supabase = await createClient();
  const [site, periods, elements, evidence, links, photos, images, regions] = await Promise.all([
    supabase.from("sites").select("reconstruction_year, site_type").eq("id", siteId).single(),
    supabase.from("periods").select("name, year_from, year_to").eq("site_id", siteId).order("sort"),
    supabase
      .from("elements")
      .select("id, name, kind, confidence, rationale, assumptions, sort")
      .eq("site_id", siteId)
      .order("sort"),
    supabase.from("evidence").select("id, title, note, citation, kind").eq("site_id", siteId),
    supabase.from("element_evidence").select("element_id, evidence_id"),
    supabase
      .from("assets")
      .select("id, filename, storage_path, width, height, caption, mime")
      .eq("site_id", siteId)
      .eq("kind", "photo")
      .order("created_at", { ascending: false }),
    supabase
      .from("reconstruction_images")
      .select(
        "id, source_photo_id, image_url, prompt_text, provider, model, origin, status, error, is_current, element_ids, created_at",
      )
      .eq("site_id", siteId)
      .order("created_at", { ascending: false }),
    supabase.from("reconstruction_regions").select("id, reconstruction_image_id, element_id, shape"),
  ]);

  for (const result of [site, periods, elements, evidence, links, photos, images]) {
    if (result.error) throw new Error(result.error.message);
  }

  const evidenceById = new Map((evidence.data ?? []).map((row) => [row.id as string, row]));
  const linksByElement = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = linksByElement.get(link.element_id as string) ?? [];
    list.push(link.evidence_id as string);
    linksByElement.set(link.element_id as string, list);
  }

  const elementRows = (elements.data ?? []).filter((row) => row.kind !== "group");
  const mappedElements: ReconstructionElement[] = elementRows.map((row) => {
    const evidenceIds = linksByElement.get(row.id as string) ?? [];
    const notes = evidenceIds
      .map((id) => evidenceById.get(id))
      .filter(Boolean)
      .map((item) => [item!.title, item!.note, item!.citation].filter(Boolean).join(" — "));
    return {
      id: row.id as string,
      name: row.name as string,
      kind: row.kind as string,
      confidence: row.confidence as ReconstructionElement["confidence"],
      rationale: (row.rationale as string | null) ?? "",
      assumptions: (row.assumptions as string[] | null) ?? [],
      evidenceCount: evidenceIds.length,
      evidenceIds,
      evidenceNotes: notes,
    };
  });

  const period = periods.data?.[0];
  const year = site.data?.reconstruction_year ?? period?.year_from ?? null;
  const periodAndStyle = [
    period?.name ?? (year ? `c. ${year} CE` : "Period not set"),
    site.data?.site_type ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  const photoRows: ReconstructionPhoto[] = await Promise.all(
    (photos.data ?? []).map(async (asset) => {
      let url: string | null = null;
      if (
        asset.storage_path?.startsWith("seed-") ||
        asset.storage_path?.startsWith("seed-reconstructions/") ||
        asset.storage_path?.startsWith("site-covers/") ||
        asset.storage_path?.startsWith("/")
      ) {
        url = asset.storage_path.startsWith("/") ? asset.storage_path : `/${asset.storage_path}`;
      } else if (asset.storage_path) {
        const signed = await supabase.storage.from("assets").createSignedUrl(asset.storage_path, 60 * 60);
        url = signed.data?.signedUrl ?? null;
      }
      return {
        id: asset.id as string,
        filename: asset.filename as string,
        url,
        width: (asset.width as number | null) ?? null,
        height: (asset.height as number | null) ?? null,
        caption: (asset.caption as string | null) ?? null,
      };
    }),
  );

  // Seed fallback if Document has no photos yet.
  if (photoRows.length === 0) {
    photoRows.push({
      id: "seed-cover",
      filename: "source-photo.jpg",
      url: "/seed-reconstructions/ajanta-cave-1/source-photo.jpg",
      width: null,
      height: null,
      caption: "Placeholder site photograph",
    });
  }

  const regionRows = regions.data ?? [];
  const attempts: ReconstructionAttempt[] = (images.data ?? []).map((row) => ({
    id: row.id as string,
    sourcePhotoId: (row.source_photo_id as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    promptText: (row.prompt_text as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    origin: row.origin as ReconstructionAttempt["origin"],
    status: row.status as ReconstructionAttempt["status"],
    error: (row.error as string | null) ?? null,
    isCurrent: Boolean(row.is_current),
    elementIds: (row.element_ids as string[] | null) ?? [],
    createdAt: row.created_at as string,
    regions: regionRows
      .filter((region) => region.reconstruction_image_id === row.id)
      .map((region) => ({
        id: region.id as string,
        elementId: region.element_id as string,
        shape: normalizeShape(region.shape),
      })),
  }));

  const current = attempts.find((item) => item.isCurrent && item.status === "done") ?? null;
  const withEvidence = mappedElements.filter((element) => element.evidenceCount > 0);
  const previewPrompt = buildReconstructionPrompt({
    periodAndStyle,
    elements: withEvidence.map((element) => ({
      name: element.name,
      description: element.rationale || element.assumptions.join("; "),
      evidenceNotes: element.evidenceNotes,
    })),
  });

  return {
    siteId,
    slug,
    year,
    siteType: (site.data?.site_type as string | null) ?? null,
    periodAndStyle,
    photos: photoRows,
    elements: mappedElements,
    evidence: (evidence.data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      kind: String((row as { kind?: string }).kind ?? ""),
    })),
    attempts,
    current,
    previewPrompt,
    previewToken,
  };
}

function normalizeShape(value: unknown): { x: number; y: number }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => {
      if (!point || typeof point !== "object") return null;
      const row = point as { x?: number; y?: number };
      if (typeof row.x !== "number" || typeof row.y !== "number") return null;
      return { x: row.x, y: row.y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));
}
