"use server";

import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReconstructionPrompt } from "@/lib/reconstruction/prompt";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  revalidatePath(`/s/${slug}/review`);
  revalidatePath(`/s/${slug}/publish`);
  revalidatePath(`/s/${slug}/archive`);
  return { ok: true as const };
}

export async function buildPromptForElements(siteId: string, elementIds: string[]) {
  const gate = await writer(siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const [site, periods, elements, evidence, links] = await Promise.all([
    gate.supabase.from("sites").select("reconstruction_year, site_type").eq("id", siteId).single(),
    gate.supabase.from("periods").select("name, year_from").eq("site_id", siteId).order("sort").limit(1),
    gate.supabase.from("elements").select("id, name, rationale, assumptions").eq("site_id", siteId).in("id", elementIds),
    gate.supabase.from("evidence").select("id, title, note, citation").eq("site_id", siteId),
    gate.supabase.from("element_evidence").select("element_id, evidence_id").in("element_id", elementIds),
  ]);
  if (site.error || elements.error) return { ok: false as const, error: "Could not build the prompt." };
  const evidenceById = new Map((evidence.data ?? []).map((row) => [row.id as string, row]));
  const linksByElement = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = linksByElement.get(link.element_id as string) ?? [];
    list.push(link.evidence_id as string);
    linksByElement.set(link.element_id as string, list);
  }
  const period = periods.data?.[0];
  const periodAndStyle = [
    period?.name ?? (site.data?.reconstruction_year ? `c. ${site.data.reconstruction_year} CE` : "Period not set"),
    site.data?.site_type ?? null,
  ]
    .filter(Boolean)
    .join(" · ");
  const prompt = buildReconstructionPrompt({
    periodAndStyle,
    elements: (elements.data ?? []).map((row) => {
      const notes = (linksByElement.get(row.id as string) ?? [])
        .map((id) => evidenceById.get(id))
        .filter(Boolean)
        .map((item) => [item!.title, item!.note, item!.citation].filter(Boolean).join(" — "));
      return {
        name: row.name as string,
        description: String(row.rationale ?? "") || ((row.assumptions as string[] | null) ?? []).join("; "),
        evidenceNotes: notes,
      };
    }),
  });
  return { ok: true as const, prompt, periodAndStyle };
}

export async function setCurrentReconstruction(input: { siteId: string; id: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid reconstruction." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };

  await gate.supabase
    .from("reconstruction_images")
    .update({ is_current: false })
    .eq("site_id", parsed.data.siteId)
    .eq("is_current", true);

  const { error } = await gate.supabase
    .from("reconstruction_images")
    .update({ is_current: true })
    .eq("id", parsed.data.id)
    .eq("site_id", parsed.data.siteId)
    .eq("status", "done");
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

const pointSchema = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });

export async function saveRegion(input: {
  siteId: string;
  reconstructionImageId: string;
  elementId: string;
  shape: { x: number; y: number }[];
}) {
  const parsed = z
    .object({
      siteId: z.string().uuid(),
      reconstructionImageId: z.string().uuid(),
      elementId: z.string().uuid(),
      shape: z.array(pointSchema).min(3).max(64),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Draw at least three points." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };

  const image = await gate.supabase
    .from("reconstruction_images")
    .select("id, site_id")
    .eq("id", parsed.data.reconstructionImageId)
    .eq("site_id", parsed.data.siteId)
    .maybeSingle();
  if (!image.data) return { ok: false as const, error: "Reconstruction not found." };

  const { data, error } = await gate.supabase
    .from("reconstruction_regions")
    .insert({
      reconstruction_image_id: parsed.data.reconstructionImageId,
      element_id: parsed.data.elementId,
      shape: parsed.data.shape,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  refresh(gate.slug);
  return { ok: true as const, id: data.id as string };
}

export async function deleteRegion(input: { siteId: string; id: string }) {
  const parsed = z.object({ siteId: z.string().uuid(), id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid region." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase) return { ok: false as const, error: gate.error };
  const { error } = await gate.supabase.from("reconstruction_regions").delete().eq("id", parsed.data.id);
  if (error) return { ok: false as const, error: error.message };
  return refresh(gate.slug);
}

export async function uploadReconstruction(input: {
  siteId: string;
  sourcePhotoId: string | null;
  storagePath: string;
  filename: string;
  elementIds: string[];
}) {
  const parsed = z
    .object({
      siteId: z.string().uuid(),
      sourcePhotoId: z.string().uuid().nullable(),
      storagePath: z.string().min(3).max(240),
      filename: z.string().min(1).max(180),
      elementIds: z.array(z.string().uuid()).default([]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Upload could not be saved." };
  const gate = await writer(parsed.data.siteId);
  if (!gate.supabase || !gate.session) return { ok: false as const, error: gate.error };

  if (!parsed.data.storagePath.startsWith(`${parsed.data.siteId}/`)) {
    return { ok: false as const, error: "The file was stored in the wrong folder." };
  }

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/published/${parsed.data.storagePath}`;
  // Prefer assets bucket signed path for working copy; also copy to a stable URL field.
  const admin = createAdminClient();
  const downloaded = await admin.storage.from("assets").download(parsed.data.storagePath);
  if (downloaded.data) {
    await admin.storage
      .from("published")
      .upload(parsed.data.storagePath, await downloaded.data.arrayBuffer(), { upsert: true, contentType: "image/png" });
  }

  await gate.supabase
    .from("reconstruction_images")
    .update({ is_current: false })
    .eq("site_id", parsed.data.siteId)
    .eq("is_current", true);

  const { data, error } = await gate.supabase
    .from("reconstruction_images")
    .insert({
      site_id: parsed.data.siteId,
      source_photo_id: parsed.data.sourcePhotoId,
      image_url: publicUrl,
      prompt_text: null,
      provider: null,
      model: null,
      origin: "uploaded",
      status: "done",
      is_current: true,
      element_ids: parsed.data.elementIds,
      created_by: gate.session.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  refresh(gate.slug);
  return { ok: true as const, id: data.id as string };
}
