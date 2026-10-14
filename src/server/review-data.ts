import "server-only";

import type { ChecklistItem, ReviewComment, ReviewDiff, ReviewItemStatus, ReviewStatus } from "@/lib/studio/review";
import { createClient } from "@/lib/supabase/server";

export type ReviewItemView = {
  id: string;
  targetType: "element" | "story";
  targetId: string;
  name: string;
  status: ReviewItemStatus;
  confidence: "high" | "medium" | "low" | null;
  comments: ReviewComment[];
};

export type ReviewView = {
  id: string;
  siteId: string;
  slug: string;
  siteName: string;
  location: string | null;
  status: ReviewStatus;
  submittedAt: string;
  submittedBy: string;
  submittedByName: string;
  decidedByName: string | null;
  canApprove: boolean;
  items: ReviewItemView[];
  diff: ReviewDiff[];
  checklist: ChecklistItem[];
  reviewerName: string | null;
};

type DiffRaw = {
  type?: string;
  element_id?: string;
  evidence_id?: string;
  story_id?: string;
  name?: string;
  from?: string;
  to?: string;
};

export async function reviewForSite(siteId: string, slug: string): Promise<{
  slug: string;
  siteName: string;
  roleIsCreator: boolean;
  reviewerName: string | null;
  diff: ReviewDiff[];
  checklist: ChecklistItem[];
  review: ReviewView | null;
}> {
  const supabase = await createClient();
  const site = await supabase.from("sites").select("id, name, org_id, current_version_id").eq("id", siteId).single();
  if (site.error) throw new Error(site.error.message);
  const [diff, checklist, review, reviewerName, sessionRole] = await Promise.all([
    loadDiff(supabase, siteId),
    loadChecklist(supabase, siteId),
    loadOpenReview(supabase, siteId),
    reviewerForOrg(supabase, site.data.org_id as string),
    currentRole(supabase, site.data.org_id as string),
  ]);
  return {
    slug,
    siteName: site.data.name as string,
    roleIsCreator: sessionRole === "creator",
    reviewerName,
    diff,
    checklist,
    review,
  };
}

export async function reviewQueue(): Promise<ReviewView[]> {
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name, location, org_id");
  if (sites.error) throw new Error(sites.error.message);
  const views: ReviewView[] = [];
  for (const site of sites.data ?? []) {
    const open = await loadOpenReview(supabase, site.id as string);
    const approved = await loadApproved(supabase, site.id as string);
    const diff = await loadDiff(supabase, site.id as string);
    const checklist = await loadChecklist(supabase, site.id as string);
    const reviewerName = await reviewerForOrg(supabase, site.org_id as string);
    for (const review of [...(open ? [open] : []), ...approved]) {
      views.push({
        ...review,
        slug: site.slug as string,
        siteName: site.name as string,
        location: (site.location as string | null) ?? null,
        diff,
        checklist,
        reviewerName,
      });
    }
  }
  return views;
}

async function currentRole(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const member = await supabase.from("org_members").select("role").eq("org_id", orgId).eq("user_id", user.user.id).maybeSingle();
  return (member.data?.role as string | undefined) ?? null;
}

async function reviewerForOrg(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const members = await supabase.from("org_members").select("user_id, role").eq("org_id", orgId).eq("role", "reviewer");
  const id = members.data?.[0]?.user_id as string | undefined;
  if (!id) return null;
  const profile = await supabase.from("profiles").select("name").eq("id", id).maybeSingle();
  return (profile.data?.name as string | undefined) ?? null;
}

async function loadOpenReview(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, site_id, status, submitted_by, submitted_at, decided_by")
    .eq("site_id", siteId)
    .in("status", ["open", "changes_requested"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return hydrate(supabase, data);
}

async function loadApproved(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, site_id, status, submitted_by, submitted_at, decided_by")
    .eq("site_id", siteId)
    .eq("status", "approved")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const views = [];
  for (const row of data ?? []) views.push(await hydrate(supabase, row));
  return views;
}

async function hydrate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    id: string;
    site_id: string;
    status: string;
    submitted_by: string;
    submitted_at: string;
    decided_by: string | null;
  },
): Promise<ReviewView> {
  const [items, profiles, allowed] = await Promise.all([
    supabase.from("review_items").select("id, target_type, target_id, status").eq("review_id", row.id),
    supabase.from("profiles").select("id, name, initials").in("id", [row.submitted_by, row.decided_by].filter(Boolean) as string[]),
    supabase.rpc("can_approve", { p_review_id: row.id }),
  ]);
  if (items.error) throw new Error(items.error.message);
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id as string, profile]));
  const itemRows = items.data ?? [];
  const elementIds = itemRows.filter((item) => item.target_type === "element").map((item) => item.target_id as string);
  const storyIds = itemRows.filter((item) => item.target_type === "story").map((item) => item.target_id as string);
  const [elements, stories, comments] = await Promise.all([
    elementIds.length ? supabase.from("elements").select("id, name, confidence").in("id", elementIds) : Promise.resolve({ data: [], error: null }),
    storyIds.length ? supabase.from("stories").select("id, title").in("id", storyIds) : Promise.resolve({ data: [], error: null }),
    itemRows.length
      ? supabase
          .from("comments")
          .select("id, target_id, parent_id, author, body, resolved, created_at")
          .eq("target_type", "review_item")
          .in("target_id", itemRows.map((item) => item.id as string))
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const authors = [...new Set((comments.data ?? []).map((comment) => comment.author as string))];
  const authorProfiles = authors.length
    ? await supabase.from("profiles").select("id, name, initials").in("id", authors)
    : { data: [] };
  const authorName = new Map((authorProfiles.data ?? []).map((profile) => [profile.id as string, profile]));
  const elementName = new Map((elements.data ?? []).map((element) => [element.id as string, element]));
  const storyName = new Map((stories.data ?? []).map((story) => [story.id as string, story.title as string]));
  return {
    id: row.id,
    siteId: row.site_id,
    slug: "",
    siteName: "",
    location: null,
    status: row.status as ReviewStatus,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    submittedByName: (names.get(row.submitted_by)?.name as string | undefined) ?? "A team member",
    decidedByName: row.decided_by ? ((names.get(row.decided_by)?.name as string | undefined) ?? null) : null,
    canApprove: Boolean(allowed.data),
    reviewerName: null,
    diff: [],
    checklist: [],
    items: itemRows.map((item) => {
      const element = elementName.get(item.target_id as string);
      return {
        id: item.id as string,
        targetType: item.target_type as "element" | "story",
        targetId: item.target_id as string,
        name: item.target_type === "story" ? (storyName.get(item.target_id as string) ?? "Story") : (element?.name as string) ?? "Element",
        status: item.status as ReviewItemStatus,
        confidence: item.target_type === "element" ? ((element?.confidence as "high" | "medium" | "low") ?? null) : null,
        comments: (comments.data ?? [])
          .filter((comment) => comment.target_id === item.id)
          .map((comment) => {
            const author = authorName.get(comment.author as string);
            return {
              id: comment.id as string,
              parentId: (comment.parent_id as string | null) ?? null,
              authorName: (author?.name as string | undefined) ?? "Teammate",
              initials: (author?.initials as string | undefined) ?? "AN",
              body: comment.body as string,
              resolved: Boolean(comment.resolved),
              createdAt: comment.created_at as string,
            };
          }),
      };
    }),
  };
}

async function loadDiff(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string): Promise<ReviewDiff[]> {
  const { data, error } = await supabase.rpc("diff_working", { p_site_id: siteId });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DiffRaw[];
  const evidenceIds = rows.map((row) => row.evidence_id).filter((id): id is string => Boolean(id));
  const storyIds = rows.map((row) => row.story_id).filter((id): id is string => Boolean(id));
  const elementIds = rows.map((row) => row.element_id).filter((id): id is string => Boolean(id));
  const [evidence, stories, elements] = await Promise.all([
    evidenceIds.length ? supabase.from("evidence").select("id, title").in("id", evidenceIds) : Promise.resolve({ data: [] }),
    storyIds.length ? supabase.from("stories").select("id, title").in("id", storyIds) : Promise.resolve({ data: [] }),
    elementIds.length ? supabase.from("elements").select("id, name").in("id", elementIds) : Promise.resolve({ data: [] }),
  ]);
  const evidenceTitle = new Map((evidence.data ?? []).map((row) => [row.id as string, row.title as string]));
  const storyTitle = new Map((stories.data ?? []).map((row) => [row.id as string, row.title as string]));
  const elementTitle = new Map((elements.data ?? []).map((row) => [row.id as string, row.name as string]));
  return rows.map((row) => ({
    type: (row.type ?? "added") as ReviewDiff["type"],
    elementId: row.element_id,
    evidenceId: row.evidence_id,
    storyId: row.story_id,
    name: row.name ?? elementTitle.get(row.element_id ?? "") ?? storyTitle.get(row.story_id ?? "") ?? "Item",
    from: row.from,
    to: row.to,
    sourceTitle: row.evidence_id ? evidenceTitle.get(row.evidence_id) : undefined,
  }));
}

async function loadChecklist(supabase: Awaited<ReturnType<typeof createClient>>, siteId: string): Promise<ChecklistItem[]> {
  const [elements, links, steps] = await Promise.all([
    supabase.from("elements").select("id, kind, confidence, rationale, assumptions").eq("site_id", siteId),
    supabase.from("element_evidence").select("element_id"),
    supabase.from("story_steps").select("body, source_ids, story_id"),
  ]);
  if (elements.error) throw new Error(elements.error.message);
  const linked = new Set((links.data ?? []).map((row) => row.element_id as string));
  const concrete = (elements.data ?? []).filter((element) => element.kind !== "group");
  const storyIds = new Set(
    (await supabase.from("stories").select("id").eq("site_id", siteId)).data?.map((row) => row.id as string) ?? [],
  );
  const siteSteps = (steps.data ?? []).filter((step) => storyIds.has(step.story_id as string));
  return [
    { label: "Evidence linked to every element", missing: concrete.filter((element) => !linked.has(element.id as string)).length },
    { label: "Confidence rated with a rationale", missing: concrete.filter((element) => !String(element.rationale ?? "").trim()).length },
    {
      label: "Assumptions stated for Medium and Low",
      missing: concrete.filter((element) => {
        const level = element.confidence as string;
        const assumptions = (element.assumptions as string[] | null) ?? [];
        return (level === "medium" || level === "low") && assumptions.length === 0;
      }).length,
    },
    {
      label: "Sources cited",
      missing: siteSteps.filter((step) => String(step.body ?? "").trim() && ((step.source_ids as string[] | null) ?? []).length === 0).length,
    },
  ];
}
