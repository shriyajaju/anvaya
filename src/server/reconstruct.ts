"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const transformSchema = z.object({
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  scale: z.tuple([z.number(), z.number(), z.number()]),
});

async function writer(siteId: string) {
  const session = await getSession();
  if (!session?.org) return { supabase: null, session: null, error: "Sign in again." as const };
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator") {
    return { supabase: null, session: null, error: "You can view this reconstruction, not edit it." as const };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("slug").eq("id", siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!data) return { supabase: null, session: null, error: "Site not found." as const };
  return { supabase, session, slug: data.slug as string, error: null };
}

function refresh(slug: string) {
  revalidatePath(`/s/${slug}/reconstruct`);
  revalidatePath(`/s/${slug}/overview`);
  return { ok: true as const };
}

export async function setConfidence(input: { siteId: string; id: string; confidence: "high" | "medium" | "low" }) {
  const parsed = z
    .object({ siteId: z.string().uuid(), id: z.string().uuid(), confidence: z.enum(["high", "medium", "low"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That confidence could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase
    .from("elements")
    .update({ confidence: parsed.data.confidence })
    .eq("id", parsed.data.id)
    .eq("site_id", parsed.data.siteId);
  if (error) {
    if (error.message.includes("HIGH_NEEDS_EVIDENCE")) return { ok: false as const, error: "HIGH_NEEDS_EVIDENCE" };
    return { ok: false as const, error: error.message };
  }
  return refresh(gate.slug);
}

const updateSchema = z.object({
  siteId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  rationale: z.string().max(2000).optional(),
  assumptions: z.array(z.string().max(180)).optional(),
  visible: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  kind: z.enum(["group", "structure", "architectural", "object"]).optional(),
  transform: transformSchema.optional(),
});

export async function updateElement(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That element could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { siteId, id, parentId, ...rest } = parsed.data;
  const row = {
    ...rest,
    ...(parentId !== undefined ? { parent_id: parentId } : {}),
  };
  const { error } = await gate.supabase.from("elements").update(row).eq("id", id).eq("site_id", siteId);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const createSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  kind: z.enum(["structure", "architectural", "object"]),
  parentId: z.string().uuid().nullable(),
  storagePath: z.string().max(240).optional(),
  filename: z.string().max(180).optional(),
  mime: z.string().max(120).optional(),
  bytes: z.number().int().nonnegative().optional(),
});

export async function createElement(input: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the element name." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };

  let modelId: string | null = null;
  if (parsed.data.storagePath) {
    if (!parsed.data.storagePath.startsWith(`${parsed.data.siteId}/`)) {
      return { ok: false as const, error: "The model was stored in the wrong folder." };
    }
    const asset = await gate.supabase
      .from("assets")
      .insert({
        site_id: parsed.data.siteId,
        kind: "model",
        storage_path: parsed.data.storagePath,
        filename: parsed.data.filename ?? "model.glb",
        mime: parsed.data.mime ?? "model/gltf-binary",
        bytes: parsed.data.bytes ?? null,
        uploaded_by: gate.session.userId,
      })
      .select("id")
      .single();
    if (asset.error) return { ok: false as const, error: asset.error.message };
    modelId = asset.data.id;
  }

  const { error } = await gate.supabase.from("elements").insert({
    site_id: parsed.data.siteId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    parent_id: parsed.data.parentId,
    confidence: "low",
    model_asset_id: modelId,
    visible: true,
  });
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}
