import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyPreviewToken } from "@/lib/preview-token";
import type { OrgRole } from "@/lib/auth/account";
import { stepStatus, type SiteStepId, type StepSignals } from "@/lib/studio/steps";

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
