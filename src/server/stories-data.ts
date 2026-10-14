import "server-only";

import { createClient } from "@/lib/supabase/server";

export type StoryStatus = "draft" | "in_review" | "approved" | "published";
export type StoryTrigger = "arrival" | "tap" | "scan";

export type StoryStepRecord = {
  id: string;
  title: string;
  locationId: string | null;
  body: string;
  audioAssetId: string | null;
  audioName: string | null;
  audioDurationS: number | null;
  elementId: string | null;
  sourceIds: string[];
  trigger: StoryTrigger;
  sort: number;
};

export type StoryRecord = {
  id: string;
  title: string;
  category: string | null;
  summary: string;
  status: StoryStatus;
  durationS: number | null;
  locationCount: number;
  hasAudio: boolean;
  steps: StoryStepRecord[];
};

export type StoriesData = {
  siteId: string;
  slug: string;
  previewToken: string;
  stories: StoryRecord[];
  locations: { id: string; name: string; planX: number; planY: number }[];
  elements: { id: string; name: string; confidence: "high" | "medium" | "low" }[];
  sources: { id: string; title: string }[];
};

export async function storiesForSite(siteId: string, slug: string, previewToken: string): Promise<StoriesData> {
  const supabase = await createClient();
  const [stories, steps, locations, elements, sources, assets] = await Promise.all([
    supabase.from("stories").select("id, title, category, summary, status, duration_s, sort").eq("site_id", siteId).order("sort"),
    supabase.from("story_steps").select("id, story_id, title, location_id, body, audio_asset_id, audio_duration_s, element_id, source_ids, trigger, sort"),
    supabase.from("locations").select("id, name, plan_x, plan_y").eq("site_id", siteId),
    supabase.from("elements").select("id, name, confidence, sort").eq("site_id", siteId).order("sort"),
    supabase.from("evidence").select("id, title").eq("site_id", siteId).order("created_at"),
    supabase.from("assets").select("id, filename").eq("site_id", siteId).eq("kind", "audio"),
  ]);
  for (const result of [stories, steps, locations, elements, sources, assets]) {
    if (result.error) throw new Error(result.error.message);
  }
  const audioName = new Map((assets.data ?? []).map((row) => [row.id as string, row.filename as string]));
  const stepsByStory = new Map<string, StoryStepRecord[]>();
  for (const row of steps.data ?? []) {
    const storyId = row.story_id as string;
    const list = stepsByStory.get(storyId) ?? [];
    list.push({
      id: row.id as string,
      title: row.title as string,
      locationId: (row.location_id as string | null) ?? null,
      body: (row.body as string | null) ?? "",
      audioAssetId: (row.audio_asset_id as string | null) ?? null,
      audioName: row.audio_asset_id ? (audioName.get(row.audio_asset_id as string) ?? "Audio") : null,
      audioDurationS: (row.audio_duration_s as number | null) ?? null,
      elementId: (row.element_id as string | null) ?? null,
      sourceIds: (row.source_ids as string[] | null) ?? [],
      trigger: row.trigger as StoryTrigger,
      sort: row.sort as number,
    });
    stepsByStory.set(storyId, list);
  }
  return {
    siteId,
    slug,
    previewToken,
    stories: (stories.data ?? []).map((row) => {
      const storySteps = (stepsByStory.get(row.id as string) ?? []).sort((a, b) => a.sort - b.sort);
      return {
        id: row.id as string,
        title: row.title as string,
        category: (row.category as string | null) ?? null,
        summary: (row.summary as string | null) ?? "",
        status: row.status as StoryStatus,
        durationS: (row.duration_s as number | null) ?? null,
        locationCount: new Set(storySteps.map((step) => step.locationId).filter(Boolean)).size,
        hasAudio: storySteps.some((step) => step.audioAssetId),
        steps: storySteps,
      };
    }),
    locations: (locations.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      planX: Number(row.plan_x),
      planY: Number(row.plan_y),
    })),
    elements: (elements.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      confidence: row.confidence as "high" | "medium" | "low",
    })),
    sources: (sources.data ?? []).map((row) => ({ id: row.id as string, title: row.title as string })),
  };
}
