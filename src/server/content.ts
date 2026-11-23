"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function writer(siteId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, error: "Sign in again." as const };
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator") {
    return { supabase: null, error: "You can view this site, not edit it." as const };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("id").eq("id", siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!data) return { supabase: null, error: "Site not found." as const };
  return { supabase, error: null };
}

function done(slug: string, step: string) {
  revalidatePath(`/s/${slug}/${step}`);
  revalidatePath(`/s/${slug}/overview`);
  return { ok: true as const };
}

const conditionSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  state: z.enum(["good", "fair", "poor"]),
  notes: z.string().max(2000),
  survival: z.record(z.string(), z.number().int().min(1).max(5)),
});

export async function saveCondition(input: z.infer<typeof conditionSchema>) {
  const parsed = conditionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the condition record." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("condition").upsert({
    site_id: parsed.data.siteId,
    state: parsed.data.state,
    notes: parsed.data.notes,
    surveyed_at: new Date().toISOString().slice(0, 10),
    survival: parsed.data.survival,
  });
  if (error) return { ok: false as const, error: error.message };
  return done(parsed.data.slug, "document");
}

const assetSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  kind: z.enum(["photo", "model", "drawing", "document", "audio"]),
  storagePath: z.string().min(3),
  filename: z.string().min(1).max(180),
  bytes: z.number().int().nonnegative(),
  mime: z.string().max(120),
  caption: z.string().max(240).optional(),
});

export async function registerAsset(input: z.infer<typeof assetSchema>) {
  const parsed = assetSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That file could not be recorded." };
  const session = await getSession();
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !session) return { ok: false as const, error: gate.error ?? "Sign in again." };
  if (!parsed.data.storagePath.startsWith(`${parsed.data.siteId}/`)) {
    return { ok: false as const, error: "The file was stored in the wrong folder." };
  }
  const { error } = await gate.supabase.from("assets").insert({
    site_id: parsed.data.siteId,
    kind: parsed.data.kind,
    storage_path: parsed.data.storagePath,
    filename: parsed.data.filename,
    bytes: parsed.data.bytes,
    mime: parsed.data.mime,
    caption: parsed.data.caption ?? null,
    uploaded_by: session.userId,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/assets");
  return done(parsed.data.slug, "document");
}

const measurementSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  elementId: z.string().uuid().nullable(),
  dimension: z.string().trim().min(1).max(80),
  value: z.number().nullable(),
  unit: z.string().trim().max(16),
  method: z.string().trim().max(80),
});

export async function addMeasurement(input: z.infer<typeof measurementSchema>) {
  const parsed = measurementSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the measurement." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("measurements").insert({
    site_id: parsed.data.siteId,
    element_id: parsed.data.elementId,
    dimension: parsed.data.dimension,
    value: parsed.data.value,
    unit: parsed.data.unit || null,
    method: parsed.data.method || null,
  });
  if (error) return { ok: false as const, error: error.message };
  return done(parsed.data.slug, "document");
}

export async function deleteMeasurement(input: { siteId: string; slug: string; id: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("measurements").delete().eq("id", input.id).eq("site_id", input.siteId);
  if (error) return { ok: false as const, error: error.message };
  return done(input.slug, "document");
}

const metadataSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  siteType: z.string().trim().max(80),
  location: z.string().trim().max(120),
  description: z.string().trim().max(2000),
  managedBy: z.string().trim().max(120),
  licence: z.string().trim().max(240),
  archiveIndex: z.boolean(),
});

export async function saveMetadata(input: z.infer<typeof metadataSchema>) {
  const parsed = metadataSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the site details." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const current = await gate.supabase.from("sites").select("settings").eq("id", parsed.data.siteId).single();
  if (current.error) return { ok: false as const, error: current.error.message };
  const settings = { ...((current.data.settings ?? {}) as object), archiveIndex: parsed.data.archiveIndex };
  const { error } = await gate.supabase
    .from("sites")
    .update({
      name: parsed.data.name,
      site_type: parsed.data.siteType || null,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
      managed_by: parsed.data.managedBy || null,
      licence: parsed.data.licence || null,
      settings,
    })
    .eq("id", parsed.data.siteId);
  if (error) return { ok: false as const, error: error.message };
  return done(parsed.data.slug, "document");
}

const periodSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  yearFrom: z.number().int().min(-3000).max(2100).nullable(),
  yearTo: z.number().int().min(-3000).max(2100).nullable(),
});

export async function savePeriod(input: z.infer<typeof periodSchema>) {
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the period." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const row = {
    site_id: parsed.data.siteId,
    name: parsed.data.name,
    year_from: parsed.data.yearFrom,
    year_to: parsed.data.yearTo,
  };
  const { error } = parsed.data.id
    ? await gate.supabase.from("periods").update(row).eq("id", parsed.data.id).eq("site_id", parsed.data.siteId)
    : await gate.supabase.from("periods").insert(row);
  if (error) return { ok: false as const, error: error.message };
  return done(parsed.data.slug, "timeline");
}

export async function deletePeriod(input: { siteId: string; slug: string; id: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("periods").delete().eq("id", input.id).eq("site_id", input.siteId);
  if (error) return { ok: false as const, error: error.message };
  return done(input.slug, "timeline");
}

const eventSchema = z.object({
  siteId: z.string().uuid(),
  slug: z.string().min(1),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  year: z.number().int().min(-3000).max(2100).nullable(),
  approx: z.boolean(),
  periodId: z.string().uuid().nullable(),
  kind: z.string().trim().max(40),
  description: z.string().trim().max(2000),
  elementIds: z.array(z.string().uuid()),
});

export async function saveEvent(input: z.infer<typeof eventSchema>) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the event." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const row = {
    site_id: parsed.data.siteId,
    title: parsed.data.title,
    year: parsed.data.year,
    approx: parsed.data.approx,
    period_id: parsed.data.periodId,
    kind: parsed.data.kind || null,
    description: parsed.data.description || null,
    element_ids: parsed.data.elementIds,
  };
  const { error } = parsed.data.id
    ? await gate.supabase.from("events").update(row).eq("id", parsed.data.id).eq("site_id", parsed.data.siteId)
    : await gate.supabase.from("events").insert(row);
  if (error) return { ok: false as const, error: error.message };
  return done(parsed.data.slug, "timeline");
}

export async function deleteEvent(input: { siteId: string; slug: string; id: string }) {
  const gate = await writer(input.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("events").delete().eq("id", input.id).eq("site_id", input.siteId);
  if (error) return { ok: false as const, error: error.message };
  return done(input.slug, "timeline");
}
