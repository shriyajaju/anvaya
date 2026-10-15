"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function updateProfile(input: { name: string; title: string }) {
  const parsed = z.object({ name: z.string().trim().min(1).max(80), title: z.string().trim().max(80) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a name." };
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in again." };
  const supabase = await createClient();
  const initials = parsed.data.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  const { error } = await supabase.from("profiles").update({ name: parsed.data.name, title: parsed.data.title, initials }).eq("id", session.userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

const rulesSchema = z.object({
  siteId: z.string().uuid(),
  requireReview: z.boolean(),
  showAssumptions: z.boolean(),
  showAlternatives: z.boolean(),
  collectFeedback: z.boolean(),
  requireSourceForHigh: z.boolean(),
});

export async function updateSiteRules(input: z.infer<typeof rulesSchema>) {
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Those rules could not be saved." };
  const session = await getSession();
  if (!session?.org || (session.role !== "owner" && session.role !== "admin")) {
    return { ok: false as const, error: "Only an Admin can change site rules." };
  }
  const supabase = await createClient();
  const current = await supabase.from("sites").select("settings").eq("id", parsed.data.siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!current.data) return { ok: false as const, error: "Site not found." };
  const settings = { ...(current.data.settings as Record<string, unknown>), showAssumptions: parsed.data.showAssumptions, showAlternatives: parsed.data.showAlternatives, collectFeedback: parsed.data.collectFeedback, requireSourceForHigh: parsed.data.requireSourceForHigh };
  const { error } = await supabase.from("sites").update({ require_review: parsed.data.requireReview, settings }).eq("id", parsed.data.siteId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function archiveSite(siteId: string) {
  const session = await getSession();
  if (!session?.org || (session.role !== "owner" && session.role !== "admin")) {
    return { ok: false as const, error: "Only an Admin can archive a site." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sites").update({ status: "archived" }).eq("id", siteId).eq("org_id", session.org.orgId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/sites");
  return { ok: true as const };
}

export async function renameAsset(input: { id: string; filename: string }) {
  const parsed = z.object({ id: z.string().uuid(), filename: z.string().trim().min(1).max(180) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a file name." };
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("assets").update({ filename: parsed.data.filename }).eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/assets");
  return { ok: true as const };
}

export async function deleteAsset(id: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Sign in again." };
  const supabase = await createClient();
  const [elements, evidence, steps] = await Promise.all([
    supabase.from("elements").select("id").eq("model_asset_id", id).limit(1),
    supabase.from("evidence").select("id").eq("asset_id", id).limit(1),
    supabase.from("story_steps").select("id").eq("audio_asset_id", id).limit(1),
  ]);
  if ((elements.data?.length ?? 0) + (evidence.data?.length ?? 0) + (steps.data?.length ?? 0) > 0) {
    return { ok: false as const, error: "This file is still used by an element, source, or story." };
  }
  const row = await supabase.from("assets").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (row.data?.storage_path && !String(row.data.storage_path).startsWith("seed-models/")) {
    await supabase.storage.from("assets").remove([row.data.storage_path as string]);
  }
  revalidatePath("/assets");
  return { ok: true as const };
}
