import { generateEdgeGuide } from "@/lib/reconstruction/edge-guide";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  siteId: z.string().uuid(),
  assetId: z.string().uuid(),
  reconstructionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Visitors are signed out; use admin for read/write of guide assets after site check.
  const admin = createAdminClient();
  const site = await admin.from("sites").select("id, status").eq("id", parsed.data.siteId).maybeSingle();
  if (!site.data) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const sessionClient = await createClient();
  const { data: user } = await sessionClient.auth.getUser();
  if (!user.user && site.data.status !== "published") {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const asset = await admin
    .from("assets")
    .select("id, site_id, storage_path, edge_outline_url")
    .eq("id", parsed.data.assetId)
    .eq("site_id", parsed.data.siteId)
    .maybeSingle();
  if (!asset.data) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  if (asset.data.edge_outline_url) {
    return NextResponse.json({ url: asset.data.edge_outline_url, cached: true });
  }

  let sourceBytes: Buffer | null = null;
  const storagePath = asset.data.storage_path as string;
  if (
    storagePath.startsWith("seed-reconstructions/") ||
    storagePath.startsWith("site-covers/") ||
    storagePath.startsWith("seed-")
  ) {
    try {
      sourceBytes = await readFile(path.join(process.cwd(), "public", storagePath));
    } catch {
      sourceBytes = null;
    }
  }
  if (!sourceBytes) {
    const downloaded = await admin.storage.from("assets").download(storagePath);
    if (downloaded.data) sourceBytes = Buffer.from(await downloaded.data.arrayBuffer());
  }
  if (!sourceBytes) return NextResponse.json({ error: "Could not read the source photo." }, { status: 400 });

  const guide = await generateEdgeGuide({
    sourceBytes,
    siteId: parsed.data.siteId,
    assetId: parsed.data.assetId,
  });

  await admin.from("assets").update({ edge_outline_url: guide.relativeUrl }).eq("id", parsed.data.assetId);
  if (parsed.data.reconstructionId) {
    await admin
      .from("reconstruction_images")
      .update({ edge_guide_url: guide.relativeUrl })
      .eq("id", parsed.data.reconstructionId)
      .eq("site_id", parsed.data.siteId);
  }

  return NextResponse.json({ url: guide.relativeUrl, cached: false });
}
