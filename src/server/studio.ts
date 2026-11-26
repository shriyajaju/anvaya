import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyPreviewToken } from "@/lib/preview-token";
import type { OrgRole } from "@/lib/auth/account";
import { stepStatus, SITE_STEPS, type SiteStepId, type StepSignals } from "@/lib/studio/steps";

export type StudioSite = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  description: string | null;
  status: string;
  updatedAt: string;
  currentVersionId: string | null;
};

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  description: string | null;
  status: string;
  updated_at: string;
  current_version_id: string | null;
};

function mapSite(row: SiteRow): StudioSite {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    description: row.description,
    status: row.status,
    updatedAt: row.updated_at,
    currentVersionId: row.current_version_id,
  };
}

export async function listOrgSites(orgId: string): Promise<StudioSite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, location, description, status, updated_at, current_version_id")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data as SiteRow[] | null)?.map(mapSite) ?? [];
}

export async function getOrgSite(orgId: string, slug: string): Promise<StudioSite | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, location, description, status, updated_at, current_version_id")
    .eq("org_id", orgId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSite(data as SiteRow) : null;
}

async function countRows(table: string, siteId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function stepStatusForSite(site: StudioSite): Promise<Record<SiteStepId, boolean>> {
  const supabase = await createClient();
  const [evidenceCount, periodCount, eventCount, elementCount, storyCount, versionCount, condition, review] =
    await Promise.all([
      countRows("evidence", site.id),
      countRows("periods", site.id),
      countRows("events", site.id),
      countRows("elements", site.id),
      countRows("stories", site.id),
      countRows("versions", site.id),
      supabase.from("condition").select("site_id").eq("site_id", site.id).maybeSingle(),
      supabase
        .from("reviews")
        .select("id")
        .eq("site_id", site.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle(),
    ]);
  if (condition.error) throw new Error(condition.error.message);
  if (review.error) throw new Error(review.error.message);

  const signals: StepSignals = {
    hasIdentity: Boolean(site.name && site.location),
    hasCondition: Boolean(condition.data),
    evidenceCount,
    timelineCount: periodCount + eventCount,
    elementCount,
    storyCount,
    reviewApproved: Boolean(review.data),
    published: site.status === "published" || Boolean(site.currentVersionId),
    versionCount,
  };
  return stepStatus(signals);
}

const REVIEW_ROLES: OrgRole[] = ["reviewer", "admin", "owner"];

export async function openReviewCount(input: {
  orgId: string;
  userId: string;
  role: OrgRole | null;
}): Promise<number> {
  if (!input.role || !REVIEW_ROLES.includes(input.role)) return 0;
  const supabase = await createClient();
  const { data: sites, error: siteError } = await supabase
    .from("sites")
    .select("id")
    .eq("org_id", input.orgId);
  if (siteError) throw new Error(siteError.message);
  const ids = (sites ?? []).map((site) => site.id as string);
  if (ids.length === 0) return 0;
  const { data, error } = await supabase
    .from("reviews")
    .select("id, submitted_by")
    .eq("status", "open")
    .in("site_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((review) => review.submitted_by !== input.userId).length;
}

export type VisitorView = {
  name: string;
  location: string | null;
  preview: boolean;
};

export async function loadVisitorView(slug: string, token: string | null): Promise<VisitorView | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sites")
    .select("id, name, location, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const preview =
    token !== null && verifyPreviewToken(token, { slug, siteId: data.id as string });
  if (preview) {
    return { name: data.name as string, location: data.location as string | null, preview: true };
  }
  if (data.status !== "published") return null;

  const { data: version, error: versionError } = await admin
    .from("versions")
    .select("snapshot")
    .eq("site_id", data.id)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw new Error(versionError.message);
  const snapshot = version?.snapshot as { site?: { name?: string; location?: string | null } } | null;
  return {
    name: snapshot?.site?.name ?? (data.name as string),
    location: snapshot?.site?.location ?? (data.location as string | null),
    preview: false,
  };
}

export type AttentionItem = {
  siteId: string;
  slug: string;
  targetId: string;
  kind: string;
  title: string;
  meta: string;
  step: SiteStepId;
  level: "low" | "medium" | "review";
};

export type ContinueSite = {
  slug: string;
  name: string;
  location: string | null;
  description: string | null;
  updatedAt: string;
  step: SiteStepId;
  stepLabel: string;
  percent: number;
  version: string | null;
  scansThisWeek: number;
  previewToken: string;
  published: boolean;
  elements: number;
  sources: number;
  stories: number;
};

function nextOpenStep(complete: Record<SiteStepId, boolean>): SiteStepId {
  return SITE_STEPS.find((step) => !complete[step.id])?.id ?? "archive";
}

export async function dashboardForOrg(orgId: string): Promise<{
  inProgress: number;
  attention: AttentionItem[];
  continueSite: ContinueSite | null;
}> {
  const sites = await listOrgSites(orgId);
  const inProgress = sites.filter((site) => site.status === "draft" || site.status === "in_review").length;
  const ids = sites.map((site) => site.id);
  if (ids.length === 0) return { inProgress, attention: [], continueSite: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attention")
    .select("site_id, target_id, kind, title, meta, step, level")
    .in("site_id", ids);
  // Missing view / RLS should not take down the dashboard.
  if (error) {
    console.error("attention", error.message);
    return { inProgress, attention: [], continueSite: null };
  }

  const attention: AttentionItem[] = (data ?? []).flatMap((row) => {
    const step = row.step as string;
    if (!SITE_STEPS.some((item) => item.id === step)) return [];
    const level = row.level === "low" || row.level === "medium" || row.level === "review" ? row.level : "low";
    const site = sites.find((item) => item.id === row.site_id);
    if (!site) return [];
    return [
      {
        siteId: site.id,
        slug: site.slug,
        targetId: row.target_id as string,
        kind: row.kind as string,
        title: row.title as string,
        meta: row.meta as string,
        step: step as SiteStepId,
        level,
      },
    ];
  });

  const current = [...sites].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  if (!current) return { inProgress, attention, continueSite: null };

  const complete = await stepStatusForSite(current);
  const done = Object.values(complete).filter(Boolean).length;
  const step = nextOpenStep(complete);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [version, scans, elements, sources, stories] = await Promise.all([
    supabase
      .from("versions")
      .select("number")
      .eq("site_id", current.id)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", current.id)
      .eq("type", "scan")
      .gte("at", weekAgo),
    countRows("elements", current.id),
    countRows("evidence", current.id),
    countRows("stories", current.id),
  ]);
  if (version.error) throw new Error(version.error.message);
  if (scans.error) throw new Error(scans.error.message);

  const { signPreviewToken } = await import("@/lib/preview-token");
  return {
    inProgress,
    attention,
    continueSite: {
      slug: current.slug,
      name: current.name,
      location: current.location,
      description: current.description,
      updatedAt: current.updatedAt,
      step,
      stepLabel: SITE_STEPS.find((item) => item.id === step)?.label ?? step,
      percent: Math.round((done / SITE_STEPS.length) * 100),
      version: (version.data?.number as string | undefined) ?? null,
      scansThisWeek: scans.count ?? 0,
      previewToken: signPreviewToken({ slug: current.slug, siteId: current.id }),
      published: current.status === "published",
      elements,
      sources,
      stories,
    },
  };
}

export type SiteCardData = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  version: string | null;
  steps: Record<SiteStepId, boolean>;
  counts: { high: number; medium: number; low: number };
};

export async function siteCardsForOrg(orgId: string): Promise<{
  sites: SiteCardData[];
  members: { initials: string }[];
}> {
  const sites = await listOrgSites(orgId);
  const supabase = await createClient();
  const { data: members, error: memberError } = await supabase
    .from("org_members")
    .select("profiles(initials)")
    .eq("org_id", orgId);
  if (memberError) throw new Error(memberError.message);
  const initials = (members ?? []).flatMap((row) => {
    const profile = row.profiles as { initials: string | null } | { initials: string | null }[] | null;
    const one = Array.isArray(profile) ? profile[0] : profile;
    return one?.initials ? [{ initials: one.initials }] : [];
  });
  if (sites.length === 0) return { sites: [], members: initials };

  const ids = sites.map((site) => site.id);
  const [elements, versions] = await Promise.all([
    supabase.from("elements").select("site_id, confidence, kind").in("site_id", ids),
    supabase.from("versions").select("site_id, number, published_at").in("site_id", ids),
  ]);
  if (elements.error) throw new Error(elements.error.message);
  if (versions.error) throw new Error(versions.error.message);

  const cards = await Promise.all(
    sites.map(async (site) => {
      const steps = await stepStatusForSite(site);
      const counts = { high: 0, medium: 0, low: 0 };
      for (const element of elements.data ?? []) {
        if (element.site_id !== site.id || element.kind === "group") continue;
        const confidence = element.confidence as string;
        if (confidence === "high" || confidence === "medium" || confidence === "low") {
          counts[confidence] += 1;
        }
      }
      const latest = (versions.data ?? [])
        .filter((version) => version.site_id === site.id)
        .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
      const status = site.status as SiteCardData["status"];
      return {
        id: site.id,
        slug: site.slug,
        name: site.name,
        location: site.location,
        status: status === "in_review" || status === "published" || status === "archived" ? status : "draft",
        version: (latest?.number as string | undefined) ?? null,
        steps,
        counts,
      } satisfies SiteCardData;
    }),
  );
  return { sites: cards, members: initials };
}

