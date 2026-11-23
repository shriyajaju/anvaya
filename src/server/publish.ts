"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const visitorOrigin = process.env.NEXT_PUBLIC_VISITOR_URL ?? "https://anvaya.site";

export async function publishRelease(input: { siteId: string; number: string; note: string }) {
  const parsed = z
    .object({
      siteId: z.string().uuid(),
      number: z.string().trim().regex(/^\d+\.\d+$/),
      note: z.string().trim().max(500),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Use a version like 1.1." };
  const session = await getSession();
  if (!session?.org) return { ok: false as const, error: "Sign in again." };
  if (session.role === "viewer" || session.role === "reviewer") {
    return { ok: false as const, error: "You can view this site, not publish it." };
  }
  const supabase = await createClient();
  const site = await supabase.from("sites").select("slug, name").eq("id", parsed.data.siteId).eq("org_id", session.org.orgId).maybeSingle();
  if (!site.data) return { ok: false as const, error: "Site not found." };
  const allowed = await supabase.rpc("can_publish", { p_site_id: parsed.data.siteId });
  if (allowed.error) return { ok: false as const, error: allowed.error.message };
  if (!allowed.data) return { ok: false as const, error: "Changed since last approval — resubmit" };

  const invoked = await tryEdge(parsed.data, session);
  if (invoked) return finish(site.data.slug as string, parsed.data.number, invoked);

  await supabase.from("stories").update({ status: "published" }).eq("site_id", parsed.data.siteId).eq("status", "approved");
  const published = await supabase.rpc("publish_site", {
    p_site_id: parsed.data.siteId,
    p_number: parsed.data.number,
    p_note: parsed.data.note,
  });
  if (published.error || !published.data) return { ok: false as const, error: published.error?.message ?? "The version was not saved." };
  await copyAssets(parsed.data.siteId, site.data.slug as string);
  return finish(site.data.slug as string, parsed.data.number, published.data as string);
}

function finish(slug: string, number: string, versionId: string) {
  revalidatePath(`/s/${slug}/publish`);
  revalidatePath(`/s/${slug}/archive`);
  revalidatePath(`/s/${slug}/overview`);
  revalidatePath("/archive");
  return { ok: true as const, versionId, number };
}

async function tryEdge(input: { siteId: string; number: string; note: string }, session: { userId: string }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  void session;
  try {
    const response = await fetch(`${url}/functions/v1/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { versionId?: string };
    return body.versionId ?? null;
  } catch {
    return null;
  }
}

async function copyAssets(siteId: string, slug: string) {
  const admin = createAdminClient();
  const assets = await admin.from("assets").select("storage_path, filename").eq("site_id", siteId);
  for (const asset of assets.data ?? []) {
    const storagePath = asset.storage_path as string;
    const filename = (asset.filename as string) || path.basename(storagePath);
    const bytes = storagePath.startsWith("seed-models/")
      ? await readFile(path.join(process.cwd(), "public", storagePath)).catch(() => null)
      : await admin.storage.from("assets").download(storagePath).then((result) => (result.data ? result.data.arrayBuffer() : null));
    if (!bytes) continue;
    await admin.storage.from("published").upload(`${siteId}/${filename}`, bytes, { upsert: true, contentType: contentType(filename) });
  }
  const locations = await admin.from("locations").select("id, name, qr_code").eq("site_id", siteId);
  const codes = [
    { name: "site", url: `${visitorOrigin}/${slug}` },
    ...(locations.data ?? []).map((location) => {
      const code = String(location.qr_code ?? location.name).split("-").pop() ?? location.name;
      return { name: String(code), url: `${visitorOrigin}/${slug}?l=${code}` };
    }),
  ];
  const viewpoints = await admin
    .from("assets")
    .select("id, viewpoint_label")
    .eq("site_id", siteId)
    .eq("kind", "photo")
    .not("viewpoint_label", "is", null);
  const recon = await admin
    .from("reconstruction_images")
    .select("source_photo_id, element_ids")
    .eq("site_id", siteId)
    .eq("is_current", true)
    .eq("status", "done")
    .maybeSingle();
  for (const viewpoint of viewpoints.data ?? []) {
    const elementId = ((recon.data?.element_ids as string[] | null) ?? [])[0];
    if (!elementId) continue;
    if (recon.data?.source_photo_id && recon.data.source_photo_id !== viewpoint.id) continue;
    codes.push({
      name: `viewpoint-${String(viewpoint.id).slice(0, 8)}`,
      url: `${visitorOrigin}/${slug}/ar/${elementId}?camera=1`,
    });
  }
  for (const code of codes) {
    const png = await QRCode.toBuffer(code.url, { type: "png", width: 512, margin: 1 });
    const svg = await QRCode.toString(code.url, { type: "svg" });
    await admin.storage.from("published").upload(`qr/${slug}/${code.name}.png`, png, { upsert: true, contentType: "image/png" });
    await admin.storage.from("published").upload(`qr/${slug}/${code.name}.svg`, svg, { upsert: true, contentType: "image/svg+xml" });
  }
}

function contentType(filename: string) {
  if (filename.endsWith(".glb")) return "model/gltf-binary";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
