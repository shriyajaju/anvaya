import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActivityItem,
  DocumentData,
  OverviewData,
  StudioAsset,
  SurvivalElement,
  TimelineData,
  WorkflowRow,
} from "@/lib/studio/records";
import { SITE_STEPS, type SiteStepId } from "@/lib/studio/steps";

export type { ActivityItem, DocumentData, OverviewData, SurvivalElement, TimelineData };

export async function overviewForSite(
  siteId: string,
  complete: Record<SiteStepId, boolean>,
): Promise<OverviewData> {
  const supabase = await createClient();
  const [site, elements, questions, stories, evidence, versions, photos, activity, scans, missing] =
    await Promise.all([
      supabase
        .from("sites")
        .select("name, status, site_type, location")
        .eq("id", siteId)
        .single(),
      supabase.from("elements").select("id, name, kind, confidence").eq("site_id", siteId),
      supabase.from("questions").select("id, status").eq("site_id", siteId),
      supabase.from("stories").select("id").eq("site_id", siteId),
      supabase.from("evidence").select("id").eq("site_id", siteId),
      supabase
        .from("versions")
        .select("number, published_at")
        .eq("site_id", siteId)
        .order("published_at", { ascending: false }),
      supabase.from("assets").select("id").eq("site_id", siteId).eq("kind", "photo"),
      supabase.from("activity").select("id, initials, body, at").eq("site_id", siteId).order("at", { ascending: false }).limit(8),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId)
        .eq("type", "scan")
        .gte("at", new Date(Date.now() - 7 * 864e5).toISOString()),
      supabase.from("attention").select("target_id").eq("site_id", siteId).eq("kind", "no_evidence"),
    ]);

  for (const result of [site, elements, questions, stories, evidence, versions, photos, activity, scans, missing]) {
    if (result.error) throw new Error(result.error.message);
  }

  const parts = (elements.data ?? []).filter((row) => row.kind !== "group");
  const confidence = { high: 0, medium: 0, low: 0 };
  const lowNames: string[] = [];
  for (const row of parts) {
    const level = row.confidence as "high" | "medium" | "low";
    if (level === "high" || level === "medium" || level === "low") confidence[level] += 1;
    if (level === "low") lowNames.push(row.name);
  }
  const openQuestions = (questions.data ?? []).filter((row) => row.status === "open").length;
  const version = versions.data?.[0];
  const photoCount = photos.data?.length ?? 0;
  const eventCount = await count("events", siteId);
  const versionCount = versions.data?.length ?? 0;
  const missingCount = missing.data?.length ?? 0;
  const storyCount = stories.data?.length ?? 0;

  const details: Record<SiteStepId, { detail: string; tone: WorkflowRow["tone"] }> = {
    overview: { detail: complete.overview ? "Complete" : "Add a name and location", tone: "default" },
    document: {
      detail: photoCount
        ? `${photoCount} photo${photoCount === 1 ? "" : "s"} · condition recorded`
        : complete.document
          ? "Condition recorded"
          : "Not recorded",
      tone: "default",
    },
    evidence: {
      detail: openQuestions
        ? `${openQuestions} open question${openQuestions === 1 ? "" : "s"}`
        : `${evidence.data?.length ?? 0} sources`,
      tone: openQuestions ? "warn" : "default",
    },
    timeline: { detail: `${eventCount} event${eventCount === 1 ? "" : "s"}`, tone: "default" },
    reconstruct: {
      detail: missingCount
        ? `${missingCount} element${missingCount === 1 ? "" : "s"} without evidence`
        : "Evidence linked",
      tone: missingCount ? "warn" : "default",
    },
    stories: { detail: `${storyCount} stor${storyCount === 1 ? "y" : "ies"}`, tone: "default" },
    review: { detail: complete.review ? "Approved" : "Not submitted", tone: "default" },
    publish: { detail: version ? `Version ${version.number} live` : "Not published", tone: "default" },
    archive: { detail: `${versionCount} version${versionCount === 1 ? "" : "s"}`, tone: "default" },
  };

  const scansThisWeek = scans.count ?? 0;
  return {
    name: site.data?.name ?? "",
    status: site.data?.status ?? "draft",
    siteType: site.data?.site_type ?? null,
    location: site.data?.location ?? null,
    version: version?.number ?? null,
    publishedAt: version?.published_at ?? null,
    counts: {
      elements: parts.length,
      sources: evidence.data?.length ?? 0,
      stories: storyCount,
      questions: openQuestions,
    },
    confidence,
    uncertainty: lowNames.length
      ? `Uncertainty is highest in ${lowNames.join(" and ")}.`
      : "No low-confidence elements are recorded.",
    workflow: SITE_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      complete: complete[step.id],
      detail: details[step.id].detail,
      tone: details[step.id].tone,
    })),
    activity: (activity.data ?? []).map((row) => ({
      id: row.id,
      initials: row.initials ?? "—",
      body: row.body,
      at: row.at,
    })),
    caption: version
      ? `Version ${version.number} · ${scansThisWeek} scans this week`
      : "Not published",
  };
}

async function count(table: string, siteId: string) {
  const supabase = await createClient();
  const { count: total, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  return total ?? 0;
}

export async function documentForSite(siteId: string, slug: string): Promise<DocumentData> {
  const supabase = await createClient();
  const [site, condition, elements, assets, measurements] = await Promise.all([
    supabase
      .from("sites")
      .select("name, location, site_type, description, managed_by, licence, settings")
      .eq("id", siteId)
      .single(),
    supabase.from("condition").select("state, notes, surveyed_at, survival").eq("site_id", siteId).maybeSingle(),
    supabase.from("elements").select("id, name, kind, plan_x, plan_y, sort").eq("site_id", siteId).order("sort"),
    supabase
      .from("assets")
      .select("id, kind, filename, caption, mime, taken_on, storage_path")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false }),
    supabase.from("measurements").select("id, element_id, dimension, value, unit, method").eq("site_id", siteId),
  ]);
  for (const result of [site, condition, elements, assets, measurements]) {
    if (result.error) throw new Error(result.error.message);
  }

  const survival = (condition.data?.survival ?? {}) as Record<string, number>;
  const signed = await Promise.all(
    (assets.data ?? []).map(async (asset) => {
      const { data } = await supabase.storage.from("assets").createSignedUrl(asset.storage_path, 60 * 60);
      return {
        id: asset.id,
        kind: asset.kind,
        filename: asset.filename,
        caption: asset.caption,
        mime: asset.mime,
        takenOn: asset.taken_on,
        url: data?.signedUrl ?? null,
      } satisfies StudioAsset;
    }),
  );
  const names = new Map((elements.data ?? []).map((row) => [row.id, row.name]));
  const settings = (site.data?.settings ?? {}) as { archiveIndex?: boolean };

  return {
    siteId,
    slug,
    name: site.data?.name ?? "",
    location: site.data?.location ?? null,
    siteType: site.data?.site_type ?? null,
    description: site.data?.description ?? null,
    managedBy: site.data?.managed_by ?? null,
    licence: site.data?.licence ?? null,
    archiveIndex: settings.archiveIndex !== false,
    condition: {
      state: (condition.data?.state as "good" | "fair" | "poor") ?? "fair",
      notes: condition.data?.notes ?? "",
      surveyedAt: condition.data?.surveyed_at ?? null,
    },
    elements: (elements.data ?? [])
      .filter((row) => row.kind !== "group")
      .map((row) => ({
        id: row.id,
        name: row.name,
        planX: row.plan_x,
        planY: row.plan_y,
        score: typeof survival[row.id] === "number" ? survival[row.id] : 3,
      })),
    assets: signed,
    measurements: (measurements.data ?? []).map((row) => ({
      id: row.id,
      elementId: row.element_id,
      elementName: row.element_id ? names.get(row.element_id) ?? "Element" : "Site",
      dimension: row.dimension,
      value: row.value === null ? null : String(row.value),
      unit: row.unit,
      method: row.method,
    })),
  };
}

export async function timelineForSite(siteId: string, slug: string): Promise<TimelineData> {
  const supabase = await createClient();
  const [site, periods, events, elements] = await Promise.all([
    supabase.from("sites").select("reconstruction_year").eq("id", siteId).single(),
    supabase.from("periods").select("id, name, year_from, year_to, sort").eq("site_id", siteId).order("sort"),
    supabase.from("events").select("id, period_id, title, year, approx, kind, description, element_ids").eq("site_id", siteId),
    supabase.from("elements").select("id, name, kind, sort").eq("site_id", siteId).order("sort"),
  ]);
  for (const result of [site, periods, events, elements]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    siteId,
    slug,
    reconstructionYear: site.data?.reconstruction_year ?? null,
    periods: (periods.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      yearFrom: row.year_from,
      yearTo: row.year_to,
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id,
      periodId: row.period_id,
      title: row.title,
      year: row.year,
      approx: row.approx,
      kind: row.kind,
      description: row.description,
      elementIds: row.element_ids ?? [],
    })),
    elements: (elements.data ?? []).filter((row) => row.kind !== "group").map((row) => ({ id: row.id, name: row.name })),
  };
}

export async function previewCaption(siteId: string): Promise<string> {
  const supabase = await createClient();
  const [version, scans] = await Promise.all([
    supabase.from("versions").select("number").eq("site_id", siteId).order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("type", "scan")
      .gte("at", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);
  if (version.error) throw new Error(version.error.message);
  if (scans.error) throw new Error(scans.error.message);
  if (!version.data) return "Not published";
  return `Version ${version.data.number} · ${scans.count ?? 0} scans this week`;
}

export async function pinsForSite(siteId: string): Promise<SurvivalElement[]> {
  const supabase = await createClient();
  const [elements, condition] = await Promise.all([
    supabase.from("elements").select("id, name, kind, plan_x, plan_y, sort").eq("site_id", siteId).order("sort"),
    supabase.from("condition").select("survival").eq("site_id", siteId).maybeSingle(),
  ]);
  if (elements.error) throw new Error(elements.error.message);
  if (condition.error) throw new Error(condition.error.message);
  const survival = (condition.data?.survival ?? {}) as Record<string, number>;
  return (elements.data ?? [])
    .filter((row) => row.kind !== "group")
    .map((row) => ({
      id: row.id,
      name: row.name,
      planX: row.plan_x,
      planY: row.plan_y,
      score: typeof survival[row.id] === "number" ? survival[row.id] : 3,
    }));
}
