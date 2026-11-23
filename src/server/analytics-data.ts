import "server-only";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AnalyticsPageData = {
  sites: { id: string; slug: string; name: string; description: string | null; location: string | null }[];
  siteId: string;
  scans: number;
  sessions: number;
  arOpens: number;
  hdwkOpens: number;
  hdwkShare: number;
  storiesPlayed: number;
  elementCount: number;
  sourceCount: number;
  storyCount: number;
  elements: { id: string; name: string; confidence: "high" | "medium" | "low"; views: number }[];
  locations: { id: string; name: string; scans: number }[];
  feedback: {
    responses: number;
    understand: number | null;
    trust: number | null;
    comments: { id: string; at: string; comment: string; page: string | null }[];
  };
};

export async function loadAnalytics(siteSlug: string | undefined, range: string | undefined): Promise<AnalyticsPageData | null> {
  const session = await getSession();
  if (!session?.org) return null;
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name, description, location").eq("org_id", session.org.orgId).order("name");
  const list = (sites.data ?? []) as AnalyticsPageData["sites"];
  const site = list.find((item) => item.slug === siteSlug) ?? list[0];
  if (!site) return null;
  const since = sinceFor(range);
  if (!since) return fromViews(supabase, list, site.id);
  return fromRange(supabase, list, site.id, since);
}

function sinceFor(range: string | undefined) {
  const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function fromViews(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sites: AnalyticsPageData["sites"],
  siteId: string,
): Promise<AnalyticsPageData> {
  const [sessions, scans, ar, hdwk, viewed, locations, elements, averages, comments, storyEvents, sources, storyRows] = await Promise.all([
    supabase.from("analytics_sessions").select("session_id").eq("site_id", siteId),
    supabase.from("analytics_scans_by_location").select("location_id, scans").eq("site_id", siteId),
    supabase.from("analytics_ar_opens").select("opens").eq("site_id", siteId).maybeSingle(),
    supabase.from("analytics_hdwk").select("opens, sessions_opened, sessions").eq("site_id", siteId).maybeSingle(),
    supabase.from("analytics_most_viewed").select("element_id, views").eq("site_id", siteId).order("views", { ascending: false }),
    supabase.from("locations").select("id, name").eq("site_id", siteId),
    supabase.from("elements").select("id, name, confidence").eq("site_id", siteId),
    supabase.from("analytics_feedback_averages").select("responses, understand_avg, trust_avg").eq("site_id", siteId).maybeSingle(),
    supabase.from("feedback").select("id, at, comment, page").eq("site_id", siteId).not("comment", "is", null).order("at", { ascending: false }).limit(20),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("site_id", siteId).eq("type", "story"),
    supabase.from("evidence").select("id", { count: "exact", head: true }).eq("site_id", siteId),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("site_id", siteId),
  ]);
  const locationNames = new Map((locations.data ?? []).map((row) => [row.id as string, row.name as string]));
  const elementRows = new Map((elements.data ?? []).map((row) => [row.id as string, row]));
  const sessionCount = sessions.data?.length ?? 0;
  const hdwkOpens = Number(hdwk.data?.opens ?? 0);
  return {
    sites,
    siteId,
    scans: (scans.data ?? []).reduce((sum, row) => sum + Number(row.scans), 0),
    sessions: sessionCount,
    arOpens: Number(ar.data?.opens ?? 0),
    hdwkOpens,
    hdwkShare: sessionCount ? Math.round((Number(hdwk.data?.sessions_opened ?? 0) / sessionCount) * 100) : 0,
    storiesPlayed: storyEvents.count ?? 0,
    elementCount: elements.data?.length ?? 0,
    sourceCount: sources.count ?? 0,
    storyCount: storyRows.count ?? 0,
    elements: (viewed.data ?? []).map((row) => {
      const element = elementRows.get(row.element_id as string);
      return {
        id: row.element_id as string,
        name: (element?.name as string) ?? "Element",
        confidence: (element?.confidence as "high" | "medium" | "low") ?? "low",
        views: Number(row.views),
      };
    }),
    locations: (locations.data ?? []).map((row) => {
      const match = (scans.data ?? []).find((item) => String(item.location_id) === String(row.id));
      return {
        id: row.id as string,
        name: locationNames.get(row.id as string) ?? "Location",
        scans: Number(match?.scans ?? 0),
      };
    }),
    feedback: {
      responses: Number(averages.data?.responses ?? 0),
      understand: averages.data?.understand_avg == null ? null : Number(averages.data.understand_avg),
      trust: averages.data?.trust_avg == null ? null : Number(averages.data.trust_avg),
      comments: (comments.data ?? [])
        .filter((row) => row.comment)
        .map((row) => ({ id: row.id as string, at: row.at as string, comment: row.comment as string, page: (row.page as string | null) ?? null })),
    },
  };
}

async function fromRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sites: AnalyticsPageData["sites"],
  siteId: string,
  since: string,
): Promise<AnalyticsPageData> {
  const [events, locations, elements, feedback, sources, storyRows] = await Promise.all([
    supabase.from("analytics_events").select("type, session_id, location_id, element_id").eq("site_id", siteId).gte("at", since),
    supabase.from("locations").select("id, name").eq("site_id", siteId),
    supabase.from("elements").select("id, name, confidence").eq("site_id", siteId),
    supabase.from("feedback").select("id, at, comment, page, understand, trust").eq("site_id", siteId).gte("at", since),
    supabase.from("evidence").select("id", { count: "exact", head: true }).eq("site_id", siteId),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("site_id", siteId),
  ]);
  const rows = events.data ?? [];
  const sessions = new Set(rows.map((row) => row.session_id));
  const hdwkSessions = new Set(rows.filter((row) => row.type === "hdwk").map((row) => row.session_id));
  const views = new Map<string, number>();
  const scans = new Map<string, number>();
  for (const row of rows) {
    if (row.type === "scan" && row.location_id) scans.set(row.location_id, (scans.get(row.location_id) ?? 0) + 1);
    if (row.element_id && ["ar", "hdwk", "compare", "sources"].includes(row.type)) {
      views.set(row.element_id, (views.get(row.element_id) ?? 0) + 1);
    }
  }
  const elementRows = new Map((elements.data ?? []).map((row) => [row.id as string, row]));
  const notes = (feedback.data ?? []).filter((row) => row.comment);
  const responses = feedback.data?.length ?? 0;
  return {
    sites,
    siteId,
    scans: [...scans.values()].reduce((sum, value) => sum + value, 0),
    sessions: sessions.size,
    arOpens: rows.filter((row) => row.type === "ar").length,
    hdwkOpens: rows.filter((row) => row.type === "hdwk").length,
    hdwkShare: sessions.size ? Math.round((hdwkSessions.size / sessions.size) * 100) : 0,
    storiesPlayed: rows.filter((row) => row.type === "story").length,
    elementCount: elements.data?.length ?? 0,
    sourceCount: sources.count ?? 0,
    storyCount: storyRows.count ?? 0,
    elements: [...views.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => {
        const element = elementRows.get(id);
        return {
          id,
          name: (element?.name as string) ?? "Element",
          confidence: (element?.confidence as "high" | "medium" | "low") ?? "low",
          views: count,
        };
      }),
    locations: (locations.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      scans: scans.get(row.id as string) ?? 0,
    })),
    feedback: {
      responses,
      understand: responses ? round1((feedback.data ?? []).reduce((sum, row) => sum + Number(row.understand), 0) / responses) : null,
      trust: responses ? round1((feedback.data ?? []).reduce((sum, row) => sum + Number(row.trust), 0) / responses) : null,
      comments: notes.map((row) => ({ id: row.id as string, at: row.at as string, comment: row.comment as string, page: (row.page as string | null) ?? null })),
    },
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
