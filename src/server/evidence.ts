"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const level = z.enum(["high", "medium", "low"]);
const kind = z.enum(["physical", "archaeological", "historical", "comparative", "visual", "scholarly"]);

async function writer(siteId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, session: null, error: "Sign in again." as const };
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator" && session.role !== "reviewer") {
    return { supabase: null, session: null, error: "You can view this site, not edit it." as const };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("id, slug").eq("id", siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!data) return { supabase: null, session: null, error: "Site not found." as const };
  return { supabase, session, slug: data.slug as string, error: null };
}

function refresh(slug: string) {
  revalidatePath(`/s/${slug}/evidence`);
  revalidatePath(`/s/${slug}/overview`);
  return { ok: true as const };
}

const createSchema = z.object({
  siteId: z.string().uuid(),
  kind,
  title: z.string().trim().min(2).max(180),
  citation: z.string().trim().max(400),
  dateLabel: z.string().trim().max(40),
  url: z.string().trim().max(400),
  strength: level,
  elementIds: z.array(z.string().uuid()),
  storagePath: z.string().max(240).optional(),
  filename: z.string().max(180).optional(),
  mime: z.string().max(120).optional(),
  bytes: z.number().int().nonnegative().optional(),
});

export async function createEvidence(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the source details." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (gate.session.role === "reviewer") return { ok: false as const, error: "Reviewers can comment, not add sources." };

  let assetId: string | null = null;
  if (parsed.data.storagePath) {
    if (!parsed.data.storagePath.startsWith(`${parsed.data.siteId}/`)) {
      return { ok: false as const, error: "The file was stored in the wrong folder." };
    }
    const asset = await gate.supabase
      .from("assets")
      .insert({
        site_id: parsed.data.siteId,
        kind: parsed.data.mime?.startsWith("image/") ? "photo" : "document",
        storage_path: parsed.data.storagePath,
        filename: parsed.data.filename ?? "source",
        bytes: parsed.data.bytes ?? null,
        mime: parsed.data.mime ?? null,
        uploaded_by: gate.session.userId,
      })
      .select("id")
      .single();
    if (asset.error) return { ok: false as const, error: asset.error.message };
    assetId = asset.data.id;
  }

  const created = await gate.supabase
    .from("evidence")
    .insert({
      site_id: parsed.data.siteId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      citation: parsed.data.citation || null,
      date_label: parsed.data.dateLabel || null,
      strength: parsed.data.strength,
      url: parsed.data.url || null,
      asset_id: assetId,
      added_by: gate.session.userId,
    })
    .select("id")
    .single();
  if (created.error) return { ok: false as const, error: created.error.message };
  if (parsed.data.elementIds.length) {
    const links = await gate.supabase.from("element_evidence").insert(
      parsed.data.elementIds.map((elementId) => ({ element_id: elementId, evidence_id: created.data.id })),
    );
    if (links.error) return { ok: false as const, error: links.error.message };
  }
  return refresh(gate.slug);
}

export async function linkEvidence(input: { siteId: string; evidenceId: string; elementId: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("element_evidence").insert({
    evidence_id: input.evidenceId,
    element_id: input.elementId,
  });
  if (error && !error.message.includes("duplicate")) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

export async function unlinkEvidence(input: { siteId: string; evidenceId: string; elementId: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase
    .from("element_evidence")
    .delete()
    .eq("evidence_id", input.evidenceId)
    .eq("element_id", input.elementId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const questionSchema = z.object({
  siteId: z.string().uuid(),
  elementId: z.string().uuid().nullable(),
  question: z.string().trim().min(4).max(240),
  context: z.string().trim().max(500),
  level,
});

export async function createQuestion(input: z.infer<typeof questionSchema>) {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the question." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("questions").insert({
    site_id: parsed.data.siteId,
    element_id: parsed.data.elementId,
    question: parsed.data.question,
    context: parsed.data.context || null,
    level: parsed.data.level,
    status: "open",
    raised_by: gate.session.userId,
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

export async function resolveQuestion(input: { siteId: string; id: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase
    .from("questions")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("site_id", input.siteId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const interpretationSchema = z.object({
  siteId: z.string().uuid(),
  elementId: z.string().uuid(),
  label: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(500),
  confidence: level,
});

export async function createInterpretation(input: z.infer<typeof interpretationSchema>) {
  const parsed = interpretationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the interpretation." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (gate.session.role === "reviewer") return { ok: false as const, error: "Reviewers can comment, not add readings." };
  const existing = await gate.supabase.from("interpretations").select("id").eq("element_id", parsed.data.elementId);
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if ((existing.data ?? []).length >= 3) return { ok: false as const, error: "An element can hold three readings." };
  const { error } = await gate.supabase.from("interpretations").insert({
    site_id: parsed.data.siteId,
    element_id: parsed.data.elementId,
    label: parsed.data.label,
    summary: parsed.data.summary || null,
    confidence: parsed.data.confidence,
    selected: false,
    evidence_ids: [],
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

export async function selectInterpretation(input: { siteId: string; id: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (gate.session.role === "reviewer") return { ok: false as const, error: "Reviewers can comment, not choose a reading." };
  const row = await gate.supabase.from("interpretations").select("id, element_id, confidence").eq("id", input.id).eq("site_id", input.siteId).single();
  if (row.error) return { ok: false as const, error: row.error.message };
  const updated = await gate.supabase.from("elements").update({ confidence: row.data.confidence }).eq("id", row.data.element_id);
  if (updated.error) {
    if (updated.error.message.includes("HIGH_NEEDS_EVIDENCE")) {
      return { ok: false as const, error: "HIGH_NEEDS_EVIDENCE" };
    }
    return { ok: false as const, error: updated.error.message };
  }
  await gate.supabase.from("interpretations").update({ selected: false }).eq("element_id", row.data.element_id);
  const selected = await gate.supabase.from("interpretations").update({ selected: true }).eq("id", input.id);
  if (selected.error) return { ok: false as const, error: selected.error.message };
  return refresh(gate.slug);
}

export async function addComment(input: { siteId: string; elementId: string; body: string; parentId?: string | null }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  const body = input.body.trim();
  if (body.length < 1 || body.length > 1000) return { ok: false as const, error: "Write a shorter comment." };
  const { error } = await gate.supabase.from("comments").insert({
    site_id: input.siteId,
    target_type: "element",
    target_id: input.elementId,
    author: gate.session.userId,
    body,
    parent_id: input.parentId ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const settingsSchema = z.object({
  siteId: z.string().uuid(),
  requireSourceForHigh: z.boolean(),
  warnNoEvidence: z.boolean(),
  showAssumptions: z.boolean(),
});

export async function saveEvidenceSettings(input: z.infer<typeof settingsSchema>) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Those rules could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };
  if (gate.session.role === "reviewer") return { ok: false as const, error: "Reviewers cannot change site rules." };
  const current = await gate.supabase.from("sites").select("settings").eq("id", parsed.data.siteId).single();
  if (current.error) return { ok: false as const, error: current.error.message };
  const settings = {
    ...((current.data.settings ?? {}) as object),
    requireSourceForHigh: parsed.data.requireSourceForHigh,
    warnNoEvidence: parsed.data.warnNoEvidence,
    showAssumptions: parsed.data.showAssumptions,
  };
  const { error } = await gate.supabase.from("sites").update({ settings }).eq("id", parsed.data.siteId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

export async function savePrivateNotes(input: { siteId: string; notes: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const current = await gate.supabase.from("sites").select("settings").eq("id", input.siteId).single();
  if (current.error) return { ok: false as const, error: current.error.message };
  const settings = { ...((current.data.settings ?? {}) as object), privateNotes: input.notes.slice(0, 4000) };
  const { error } = await gate.supabase.from("sites").update({ settings }).eq("id", input.siteId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}
