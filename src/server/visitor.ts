import "server-only";

import { verifyPreviewToken } from "@/lib/preview-token";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VisitorElement, VisitorReconstruction, VisitorSnapshot, VisitorStory } from "@/lib/visitor/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const publicStorage = process.env.SUPABASE_URL ?? "";

export async function getSnapshot(slug: string, version?: string | null, previewToken?: string | null): Promise<VisitorSnapshot | null> {
  const admin = createAdminClient();
  const site = await admin.from("sites").select("id, slug, status").eq("slug", slug).maybeSingle();
  if (site.error || !site.data) return null;
  const siteId = site.data.id as string;
  if (previewToken && !verifyPreviewToken(previewToken, { slug, siteId })) redirect(`/${slug}?preview=expired`);
  const preview = Boolean(previewToken);
  if (!preview && site.data.status !== "published") return null;

  let raw: Record<string, unknown> | null = null;
  let versionId: string | null = null;
  let versionNumber: string | null = null;
  if (preview) {
    const live = await admin.rpc("snapshot_site", { p_site_id: siteId });
    if (live.error || !live.data) return null;
    raw = live.data as Record<string, unknown>;
  } else {
    let query = admin.from("versions").select("id, number, snapshot").eq("site_id", siteId).order("published_at", { ascending: false });
    if (version) query = query.eq("number", version);
    const row = await query.limit(1).maybeSingle();
    if (row.error || !row.data) return null;
    raw = row.data.snapshot as Record<string, unknown>;
    versionId = row.data.id as string;
    versionNumber = row.data.number as string;
  }

  const assets = await admin.from("assets").select("id, filename, storage_path, kind").eq("site_id", siteId);
  const files = new Map((assets.data ?? []).map((asset) => [asset.id as string, asset]));
  const review = await admin
    .from("reviews")
    .select("decided_by")
    .eq("site_id", siteId)
    .eq("status", "approved")
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const reviewer = review.data?.decided_by
    ? await admin.from("profiles").select("name").eq("id", review.data.decided_by).maybeSingle()
    : { data: null };

  return normalize(raw, {
    preview,
    versionId,
    versionNumber,
    reviewerName: (reviewer.data?.name as string | undefined) ?? null,
    files,
    siteId,
  });
}

function normalize(
  raw: Record<string, unknown>,
  meta: {
    preview: boolean;
    versionId: string | null;
    versionNumber: string | null;
    reviewerName: string | null;
    files: Map<string, { filename?: string; storage_path?: string; kind?: string }>;
    siteId: string;
  },
): VisitorSnapshot {
  const site = (raw.site ?? {}) as Record<string, unknown>;
  const settings = (raw.settings ?? {}) as Record<string, unknown>;
  const elements = ((raw.elements ?? []) as Record<string, unknown>[]).map((element) => toElement(element, meta));
  const stories = ((raw.stories ?? []) as Record<string, unknown>[]).map((story) => toStory(story, meta));
  return {
    preview: meta.preview,
    versionId: meta.versionId,
    versionNumber: meta.versionNumber,
    reviewerName: meta.reviewerName,
    site: {
      id: String(site.id ?? meta.siteId),
      slug: String(site.slug ?? ""),
      name: String(site.name ?? ""),
      location: (site.location as string | null) ?? null,
      description: (site.description as string | null) ?? null,
      year: (site.reconstruction_year as number | null) ?? null,
      managedBy: (site.managed_by as string | null) ?? null,
      licence: (site.licence as string | null) ?? null,
    },
    settings: {
      showAssumptions: settings.showAssumptions !== false,
      showAlternatives: settings.showAlternatives !== false,
      collectFeedback: settings.collectFeedback !== false,
    },
    periods: ((raw.periods ?? []) as Record<string, unknown>[]).map((period) => ({
      id: String(period.id),
      name: String(period.name ?? ""),
      yearFrom: (period.year_from as number | null) ?? null,
      yearTo: (period.year_to as number | null) ?? null,
    })),
    events: ((raw.events ?? []) as Record<string, unknown>[]).map((event) => ({
      id: String(event.id),
      title: String(event.title ?? ""),
      year: (event.year as number | null) ?? null,
      description: (event.description as string | null) ?? null,
    })),
    locations: ((raw.locations ?? []) as Record<string, unknown>[]).map((location) => {
      const qr = String(location.qr_code ?? location.name ?? "");
      return {
        id: String(location.id),
        name: String(location.name ?? ""),
        planX: Number(location.plan_x ?? 0.5),
        planY: Number(location.plan_y ?? 0.5),
        primaryElementId: (location.primary_element_id as string | null) ?? null,
        code: qr.split("-").pop() || qr,
      };
    }),
    elements,
    stories,
    reconstruction: toReconstruction(raw.reconstruction, meta),
  };
}

function toReconstruction(
  raw: unknown,
  meta: { preview: boolean; files: Map<string, { filename?: string; storage_path?: string; kind?: string }>; siteId: string },
): VisitorReconstruction {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const source = row.source_photo_id ? meta.files.get(String(row.source_photo_id)) : undefined;
  const imageUrl = (row.image_url as string | null) ?? null;
  const sourcePhotoUrl =
    (row.source_photo_url as string | null) ??
    assetUrl(source, meta) ??
    (typeof row.source_photo_id === "string" ? null : null);
  return {
    id: String(row.id),
    imageUrl,
    sourcePhotoUrl,
    sourcePhotoId: (row.source_photo_id as string | null) ?? null,
    promptText: (row.prompt_text as string | null) ?? null,
    origin: row.origin === "uploaded" ? "uploaded" : "generated",
    edgeGuideUrl: (row.edge_guide_url as string | null) ?? null,
    wireframeUrl: (row.wireframe_url as string | null) ?? null,
    viewpointLabel: (row.viewpoint_label as string | null) ?? null,
    viewpointNote: (row.viewpoint_note as string | null) ?? null,
    regions: ((row.regions ?? []) as Record<string, unknown>[]).map((region) => ({
      id: String(region.id),
      elementId: String(region.element_id),
      shape: Array.isArray(region.shape)
        ? (region.shape as { x?: number; y?: number }[])
            .filter((point) => typeof point?.x === "number" && typeof point?.y === "number")
            .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
        : [],
    })),
  };
}

function toElement(
  element: Record<string, unknown>,
  meta: { preview: boolean; files: Map<string, { filename?: string; storage_path?: string; kind?: string }>; siteId: string },
): VisitorElement {
  const asset = element.model_asset_id ? meta.files.get(String(element.model_asset_id)) : undefined;
  return {
    id: String(element.id),
    parentId: (element.parent_id as string | null) ?? null,
    name: String(element.name ?? ""),
    kind: String(element.kind ?? "object"),
    confidence: (element.confidence as VisitorElement["confidence"]) ?? "low",
    rationale: String(element.rationale ?? ""),
    assumptions: (element.assumptions as string[] | null) ?? [],
    visible: element.visible !== false,
    modelUrl: assetUrl(asset, meta),
    usdzUrl: null,
    evidence: ((element.evidence ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id),
      kind: String(item.kind ?? ""),
      title: String(item.title ?? ""),
      citation: (item.citation as string | null) ?? null,
      dateLabel: (item.date_label as string | null) ?? null,
      strength: (item.strength as VisitorElement["confidence"]) ?? "low",
      note: (item.note as string | null) ?? null,
      url: (item.url as string | null) ?? null,
    })),
    interpretations: ((element.interpretations ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id),
      label: String(item.label ?? ""),
      summary: String(item.summary ?? ""),
      confidence: (item.confidence as VisitorElement["confidence"]) ?? "low",
      selected: Boolean(item.selected),
    })),
  };
}

function toStory(
  story: Record<string, unknown>,
  meta: { preview: boolean; files: Map<string, { filename?: string; storage_path?: string }>; siteId: string },
): VisitorStory {
  return {
    id: String(story.id),
    title: String(story.title ?? ""),
    category: (story.category as string | null) ?? null,
    summary: String(story.summary ?? ""),
    durationS: Number(story.duration_s ?? 0),
    steps: ((story.steps ?? []) as Record<string, unknown>[]).map((step) => {
      const audio = step.audio_asset_id ? meta.files.get(String(step.audio_asset_id)) : undefined;
      return {
        id: String(step.id),
        title: String(step.title ?? ""),
        locationId: (step.location_id as string | null) ?? null,
        body: String(step.body ?? ""),
        audioUrl: assetUrl(audio, meta),
        elementId: (step.element_id as string | null) ?? null,
        trigger: String(step.trigger ?? "tap"),
        sort: Number(step.sort ?? 0),
      };
    }),
  };
}

function assetUrl(
  asset: { filename?: string; storage_path?: string } | undefined,
  meta: { preview: boolean; siteId: string },
) {
  if (!asset) return null;
  if (!meta.preview && asset.filename) {
    return `${publicStorage}/storage/v1/object/public/published/${meta.siteId}/${asset.filename}`;
  }
  if (asset.storage_path?.startsWith("seed-models/")) return `/${asset.storage_path}`;
  if (asset.storage_path?.startsWith("seed-reconstructions/") || asset.storage_path?.startsWith("site-covers/")) {
    return `/${asset.storage_path}`;
  }
  return null;
}

const eventSchema = z.object({
  siteId: z.string().uuid(),
  versionId: z.string().uuid().nullable(),
  type: z.string().min(1).max(40),
  elementId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  sessionId: z.string().min(4).max(80),
});

export async function logEvent(input: z.infer<typeof eventSchema>) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const admin = createAdminClient();
  const allowed = await admin.rpc("visitor_insert_allowed", { p_session: parsed.data.sessionId });
  if (allowed.error || allowed.data !== true) return { ok: false as const };
  const { error } = await admin.from("analytics_events").insert({
    site_id: parsed.data.siteId,
    version_id: parsed.data.versionId,
    type: parsed.data.type,
    element_id: parsed.data.elementId ?? null,
    location_id: parsed.data.locationId ?? null,
    session_id: parsed.data.sessionId,
    payload: {},
  });
  return { ok: !error };
}

const feedbackSchema = z.object({
  siteId: z.string().uuid(),
  versionId: z.string().uuid().nullable(),
  understand: z.number().int().min(1).max(5),
  trust: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  page: z.string().max(80),
  sessionId: z.string().min(4).max(80),
});

export async function saveFeedback(input: z.infer<typeof feedbackSchema>) {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Choose a rating from 1 to 5." };
  const admin = createAdminClient();
  const allowed = await admin.rpc("visitor_insert_allowed", { p_session: parsed.data.sessionId });
  if (allowed.error || allowed.data !== true) return { ok: false as const, error: "Too many responses from this visit. Try again later." };
  const { error } = await admin.from("feedback").insert({
    site_id: parsed.data.siteId,
    version_id: parsed.data.versionId,
    understand: parsed.data.understand,
    trust: parsed.data.trust,
    comment: parsed.data.comment ?? null,
    page: parsed.data.page,
    session_id: parsed.data.sessionId,
  });
  if (error) return { ok: false as const, error: "The feedback was not saved." };
  revalidatePath("/analytics");
  return { ok: true as const };
}
