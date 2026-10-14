"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function writer(siteId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, session: null, error: "Sign in again." as const };
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator") {
    return { supabase: null, session: null, error: "You can view these stories, not edit them." as const };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("slug").eq("id", siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!data) return { supabase: null, session: null, error: "Site not found." as const };
  return { supabase, session, slug: data.slug as string, error: null };
}

function refresh(slug: string) {
  revalidatePath(`/s/${slug}/stories`);
  revalidatePath(`/s/${slug}/overview`);
  return { ok: true as const };
}

const createSchema = z.object({
  siteId: z.string().uuid(),
  title: z.string().trim().min(2).max(80),
  category: z.string().trim().max(40).optional(),
  summary: z.string().trim().max(280).optional(),
});

export async function createStory(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Give the story a title." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { count } = await gate.supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("site_id", parsed.data.siteId);
  const { data, error } = await gate.supabase
    .from("stories")
    .insert({
      site_id: parsed.data.siteId,
      title: parsed.data.title,
      category: parsed.data.category || null,
      summary: parsed.data.summary || "Placeholder story. Not a historical account.",
      status: "draft",
      sort: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "The story was not created." };
  const step = await gate.supabase.from("story_steps").insert({
    story_id: data.id,
    title: "Arrival",
    body: "",
    trigger: "arrival",
    sort: 0,
  });
  if (step.error) return { ok: false as const, error: step.error.message };
  refresh(gate.slug);
  return { ok: true as const, id: data.id as string };
}

const stepSchema = z.object({
  siteId: z.string().uuid(),
  storyId: z.string().uuid(),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(80).optional(),
  locationId: z.string().uuid().nullable().optional(),
  body: z.string().max(4000).optional(),
  elementId: z.string().uuid().nullable().optional(),
  sourceIds: z.array(z.string().uuid()).optional(),
  trigger: z.enum(["arrival", "tap", "scan"]).optional(),
});

export async function updateStep(input: z.infer<typeof stepSchema>) {
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That step could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { siteId, storyId, id, locationId, elementId, sourceIds, ...rest } = parsed.data;
  const row = {
    ...rest,
    ...(locationId !== undefined ? { location_id: locationId } : {}),
    ...(elementId !== undefined ? { element_id: elementId } : {}),
    ...(sourceIds !== undefined ? { source_ids: sourceIds } : {}),
  };
  const { error } = await gate.supabase.from("story_steps").update(row).eq("id", id).eq("story_id", storyId);
  if (error) return { ok: false as const, error: error.message };
  void siteId;
  return refresh(gate.slug);
}

export async function reorderSteps(input: { siteId: string; storyId: string; ids: string[] }) {
  const parsed = z
    .object({ siteId: z.string().uuid(), storyId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1) })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "The steps could not be reordered." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  for (const [index, id] of parsed.data.ids.entries()) {
    const { error } = await gate.supabase
      .from("story_steps")
      .update({ sort: index })
      .eq("id", id)
      .eq("story_id", parsed.data.storyId);
    if (error) return { ok: false as const, error: error.message };
  }
  return refresh(gate.slug);
}

export async function addStep(input: { siteId: string; storyId: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), storyId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "A step could not be added." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { count } = await gate.supabase
    .from("story_steps")
    .select("id", { count: "exact", head: true })
    .eq("story_id", parsed.data.storyId);
  const { error } = await gate.supabase.from("story_steps").insert({
    story_id: parsed.data.storyId,
    title: `Step ${(count ?? 0) + 1}`,
    body: "",
    trigger: "tap",
    sort: count ?? 0,
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const audioSchema = z.object({
  siteId: z.string().uuid(),
  storyId: z.string().uuid(),
  stepId: z.string().uuid(),
  storagePath: z.string().min(3),
  filename: z.string().min(1).max(180),
  bytes: z.number().int().nonnegative(),
  mime: z.string().max(120),
  durationS: z.number().int().nonnegative(),
});

export async function attachStepAudio(input: z.infer<typeof audioSchema>) {
  const parsed = audioSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That audio could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (!parsed.data.storagePath.startsWith(`${parsed.data.siteId}/`)) {
    return { ok: false as const, error: "The file was stored in the wrong folder." };
  }
  const inserted = await gate.supabase
    .from("assets")
    .insert({
      site_id: parsed.data.siteId,
      kind: "audio",
      storage_path: parsed.data.storagePath,
      filename: parsed.data.filename,
      bytes: parsed.data.bytes,
      mime: parsed.data.mime,
      uploaded_by: gate.session.userId,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) return { ok: false as const, error: inserted.error?.message ?? "The audio was not recorded." };
  const { error } = await gate.supabase
    .from("story_steps")
    .update({ audio_asset_id: inserted.data.id, audio_duration_s: parsed.data.durationS })
    .eq("id", parsed.data.stepId)
    .eq("story_id", parsed.data.storyId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}
