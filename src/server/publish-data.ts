import "server-only";

import type { SceneElement } from "@/server/reconstruct-data";
import { createClient } from "@/lib/supabase/server";
import type { ReviewDiff } from "@/lib/studio/review";

export type VersionCardData = {
  id: string;
  siteId: string;
  slug: string;
  siteName: string;
  number: string;
  note: string;
  publishedAt: string;
  elements: number;
  sources: number;
  stories: number;
  locations: number;
  high: number;
  medium: number;
  low: number;
  changes: number;
};

export type PublishPageData = {
  siteId: string;
  slug: string;
  name: string;
  canPublish: boolean;
  blockReason: string | null;
  missingEvidence: number;
  elements: number;
  sources: number;
  stories: number;
  minutes: number;
  locations: number;
  high: number;
  medium: number;
  low: number;
  nextNumber: string;
  previewToken: string;
};

type Snap = {
  elements?: { id?: string; name?: string; kind?: string; confidence?: string; model_asset_id?: string | null; visible?: boolean; transform?: SceneElement["transform"] }[];
  stories?: { id?: string }[];
  locations?: { id?: string }[];
  counts?: { evidence?: number };
};

export async function publishPage(siteId: string, slug: string, role: string | null, previewToken: string): Promise<PublishPageData> {
  const supabase = await createClient();
  const [site, elements, evidence, stories, locations, versions, allowed, signature, review] = await Promise.all([
    supabase.from("sites").select("name, require_review").eq("id", siteId).single(),
    supabase.from("elements").select("id, kind, confidence").eq("site_id", siteId),
    supabase.from("evidence").select("id").eq("site_id", siteId),
    supabase.from("stories").select("duration_s, status").eq("site_id", siteId),
    supabase.from("locations").select("id").eq("site_id", siteId),
    supabase.from("versions").select("number").eq("site_id", siteId).order("published_at", { ascending: false }).limit(1),
    supabase.rpc("can_publish", { p_site_id: siteId }),
    supabase.rpc("content_sig", { p_site_id: siteId }),
    supabase.from("reviews").select("status, content_sig").eq("site_id", siteId).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const concrete = (elements.data ?? []).filter((element) => element.kind !== "group");
  const ids = concrete.map((element) => element.id as string);
  const linked = ids.length
    ? await supabase.from("element_evidence").select("element_id").in("element_id", ids)
    : { data: [] };
  const withEvidence = new Set((linked.data ?? []).map((row) => row.element_id as string));
  const counts = { high: 0, medium: 0, low: 0 };
  for (const element of concrete) counts[element.confidence as "high" | "medium" | "low"] += 1;
  const minutes = Math.max(
    1,
    Math.round(((stories.data ?? []).reduce((sum, story) => sum + (Number(story.duration_s) || 0), 0) || 60) / 60),
  );
  const latest = review.data;
  let blockReason: string | null = null;
  if (role !== "admin" && role !== "owner") blockReason = "Only an Admin can publish.";
  else if (!allowed.data) {
    if (!latest || latest.status !== "approved") blockReason = "Submit this site for review and wait for approval.";
    else if (latest.content_sig !== signature.data) blockReason = "Changed since last approval — resubmit";
    else blockReason = "This site cannot be published yet.";
  }
  return {
    siteId,
    slug,
    name: (site.data?.name as string) ?? slug,
    canPublish: Boolean(allowed.data) && !blockReason,
    blockReason,
    missingEvidence: concrete.filter((element) => !withEvidence.has(element.id as string)).length,
    elements: concrete.length,
    sources: evidence.data?.length ?? 0,
    stories: stories.data?.length ?? 0,
    minutes,
    locations: locations.data?.length ?? 0,
    ...counts,
    nextNumber: nextVersion((versions.data?.[0]?.number as string | undefined) ?? null),
    previewToken,
  };
}

export async function versionsForOrg(orgId: string): Promise<VersionCardData[]> {
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name").eq("org_id", orgId);
  if (sites.error) throw new Error(sites.error.message);
  const cards: VersionCardData[] = [];
  for (const site of sites.data ?? []) cards.push(...(await versionsForSite(site.id as string, site.slug as string, site.name as string)));
  return cards.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function versionsForSite(siteId: string, slug: string, siteName: string): Promise<VersionCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("versions")
    .select("id, number, note, published_at, snapshot")
    .eq("site_id", siteId)
    .order("published_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const cards: VersionCardData[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const snap = (row.snapshot ?? {}) as Snap;
    const elements = (snap.elements ?? []).filter((element) => element.kind !== "group");
    const counts = { high: 0, medium: 0, low: 0 };
    for (const element of elements) {
      const level = element.confidence;
      if (level === "high" || level === "medium" || level === "low") counts[level] += 1;
    }
    let changes = 0;
    if (index > 0) {
      const diff = await supabase.rpc("diff_versions", { a: rows[index - 1].id, b: row.id });
      changes = Array.isArray(diff.data) ? diff.data.length : 0;
    }
    cards.push({
      id: row.id as string,
      siteId,
      slug,
      siteName,
      number: row.number as string,
      note: (row.note as string | null) ?? "",
      publishedAt: row.published_at as string,
      elements: elements.length,
      sources: Number(snap.counts?.evidence ?? 0),
      stories: snap.stories?.length ?? 0,
      locations: snap.locations?.length ?? 0,
      ...counts,
      changes,
    });
  }
  return cards.reverse();
}

export async function compareVersions(siteId: string, leftId: string, rightId: string) {
  const supabase = await createClient();
  const [left, right, diff, assets] = await Promise.all([
    supabase.from("versions").select("id, number, published_at, snapshot").eq("id", leftId).eq("site_id", siteId).single(),
    supabase.from("versions").select("id, number, published_at, snapshot").eq("id", rightId).eq("site_id", siteId).single(),
    supabase.rpc("diff_versions", { a: leftId, b: rightId }),
    supabase.from("assets").select("id, storage_path").eq("site_id", siteId),
  ]);
  if (left.error || right.error) throw new Error(left.error?.message ?? right.error?.message);
  const models = new Map((assets.data ?? []).map((asset) => [asset.id as string, asset.storage_path as string]));
  const evidenceIds = ((diff.data ?? []) as { evidence_id?: string }[]).map((row) => row.evidence_id).filter((id): id is string => Boolean(id));
  const evidence = evidenceIds.length ? await supabase.from("evidence").select("id, title").in("id", evidenceIds) : { data: [] };
  const titles = new Map((evidence.data ?? []).map((row) => [row.id as string, row.title as string]));
  return {
    left: sceneSide(left.data, models),
    right: sceneSide(right.data, models),
    diff: ((diff.data ?? []) as { type?: string; name?: string; from?: string; to?: string; element_id?: string; evidence_id?: string; story_id?: string }[]).map(
      (row): ReviewDiff => ({
        type: (row.type ?? "added") as ReviewDiff["type"],
        name: row.name ?? "Item",
        from: row.from,
        to: row.to,
        elementId: row.element_id,
        evidenceId: row.evidence_id,
        storyId: row.story_id,
        sourceTitle: row.evidence_id ? titles.get(row.evidence_id) : undefined,
      }),
    ),
  };
}

function sceneSide(
  row: { id: string; number: string; published_at: string; snapshot: unknown },
  models: Map<string, string>,
) {
  const snap = (row.snapshot ?? {}) as Snap;
  const elements: SceneElement[] = (snap.elements ?? []).map((element) => {
    const path = element.model_asset_id ? models.get(element.model_asset_id) : null;
    return {
      id: element.id ?? crypto.randomUUID(),
      name: element.name ?? "Element",
      kind: (element.kind as SceneElement["kind"]) ?? "object",
      parentId: null,
      confidence: (element.confidence as SceneElement["confidence"]) ?? "low",
      rationale: "",
      assumptions: [],
      visible: element.visible !== false,
      transform: element.transform ?? null,
      modelUrl: path?.startsWith("seed-models/") ? `/${path}` : null,
      sources: [],
    };
  });
  const concrete = elements.filter((element) => element.kind !== "group");
  return {
    id: row.id,
    number: row.number,
    publishedAt: row.published_at,
    elements,
    high: concrete.filter((element) => element.confidence === "high").length,
    total: concrete.length,
  };
}

function nextVersion(current: string | null) {
  const match = /^(\d+)\.(\d+)$/.exec(current ?? "");
  if (!match) return "1.0";
  return `${match[1]}.${Number(match[2]) + 1}`;
}
