import { getSession } from "@/lib/auth/session";
import { buildReconstructionPrompt } from "@/lib/reconstruction/prompt";
import { generateReconstruction } from "@/lib/reconstruction/provider";
import { noteResizeNeeded } from "@/lib/reconstruction/resize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  siteId: z.string().uuid(),
  sourcePhotoId: z.string().min(1),
  elementIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.org) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator") {
    return NextResponse.json({ error: "You can view this reconstruction, not edit it." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a photo and at least one element." }, { status: 400 });
  }

  const supabase = await createClient();
  const site = await supabase
    .from("sites")
    .select("id, slug, reconstruction_year, site_type, org_id")
    .eq("id", parsed.data.siteId)
    .eq("org_id", session.org.orgId)
    .maybeSingle();
  if (!site.data) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const [periods, elements, evidence, links] = await Promise.all([
    supabase.from("periods").select("name, year_from").eq("site_id", parsed.data.siteId).order("sort").limit(1),
    supabase
      .from("elements")
      .select("id, name, rationale, assumptions, kind")
      .eq("site_id", parsed.data.siteId)
      .in("id", parsed.data.elementIds),
    supabase.from("evidence").select("id, title, note, citation").eq("site_id", parsed.data.siteId),
    supabase.from("element_evidence").select("element_id, evidence_id").in("element_id", parsed.data.elementIds),
  ]);

  if (elements.error) return NextResponse.json({ error: elements.error.message }, { status: 400 });
  const selected = elements.data ?? [];
  if (selected.length === 0) {
    return NextResponse.json({ error: "Select at least one element to rebuild." }, { status: 400 });
  }

  const linked = new Set((links.data ?? []).map((row) => row.element_id as string));
  const missing = selected.filter((row) => !linked.has(row.id as string)).map((row) => row.name as string);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Every selected element needs at least one linked source before generation.",
        missing,
      },
      { status: 400 },
    );
  }

  const evidenceById = new Map((evidence.data ?? []).map((row) => [row.id as string, row]));
  const linksByElement = new Map<string, string[]>();
  for (const link of links.data ?? []) {
    const list = linksByElement.get(link.element_id as string) ?? [];
    list.push(link.evidence_id as string);
    linksByElement.set(link.element_id as string, list);
  }

  const period = periods.data?.[0];
  const periodAndStyle = [
    period?.name ?? (site.data.reconstruction_year ? `c. ${site.data.reconstruction_year} CE` : "Period not set"),
    site.data.site_type ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  const prompt = buildReconstructionPrompt({
    periodAndStyle,
    elements: selected.map((row) => {
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

  const admin = createAdminClient();
  let photoBytes: Buffer;
  let photoMime = "image/jpeg";
  let sourcePhotoId: string | null = parsed.data.sourcePhotoId;

  if (parsed.data.sourcePhotoId === "seed-cover") {
    const origin = process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3000";
    const file = await fetch(`${origin}/seed-reconstructions/ajanta-cave-1/source-photo.jpg`);
    if (!file.ok) return NextResponse.json({ error: "Could not load the site photograph." }, { status: 400 });
    photoBytes = Buffer.from(await file.arrayBuffer());
    photoMime = file.headers.get("content-type") ?? "image/png";
    sourcePhotoId = null;
  } else {
    const asset = await supabase
      .from("assets")
      .select("id, storage_path, mime, width, height")
      .eq("id", parsed.data.sourcePhotoId)
      .eq("site_id", parsed.data.siteId)
      .maybeSingle();
    if (!asset.data?.storage_path) {
      return NextResponse.json({ error: "Choose a site photograph from Document." }, { status: 400 });
    }
    const warn = noteResizeNeeded(Buffer.alloc(0), asset.data.width as number | null, asset.data.height as number | null);
    const downloaded = await admin.storage.from("assets").download(asset.data.storage_path as string);
    if (downloaded.error || !downloaded.data) {
      return NextResponse.json({ error: "Could not read the site photograph." }, { status: 400 });
    }
    photoBytes = Buffer.from(await downloaded.data.arrayBuffer());
    photoMime = (asset.data.mime as string | null) ?? "image/jpeg";
    if (warn && process.env.RECONSTRUCTION_PROVIDER !== "openai" && process.env.RECONSTRUCTION_MOCK !== "1") {
      // Still attempt; CF may reject — surface warning on the row if it fails.
      void warn;
    }
  }

  const inserted = await supabase
    .from("reconstruction_images")
    .insert({
      site_id: parsed.data.siteId,
      source_photo_id: sourcePhotoId,
      image_url: null,
      prompt_text: prompt,
      provider: null,
      model: null,
      origin: "generated",
      status: "queued",
      is_current: false,
      element_ids: parsed.data.elementIds,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    return NextResponse.json({ error: inserted.error?.message ?? "Could not queue generation." }, { status: 400 });
  }

  const jobId = inserted.data.id as string;
  await supabase.from("reconstruction_images").update({ status: "generating" }).eq("id", jobId);

  try {
    const result = await generateReconstruction({
      photo: photoBytes,
      photoMime,
      prompt,
    });
    const storagePath = `${parsed.data.siteId}/reconstructions/${jobId}.jpg`;
    const uploaded = await admin.storage.from("assets").upload(storagePath, result.bytes, {
      contentType: result.mime,
      upsert: true,
    });
    if (uploaded.error) throw new Error(uploaded.error.message);

    await admin.storage.from("published").upload(storagePath, result.bytes, {
      contentType: result.mime,
      upsert: true,
    });

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/published/${storagePath}`;

    await supabase
      .from("reconstruction_images")
      .update({ is_current: false })
      .eq("site_id", parsed.data.siteId)
      .eq("is_current", true);

    await supabase
      .from("reconstruction_images")
      .update({
        status: "done",
        image_url: imageUrl,
        provider: result.provider,
        model: result.model,
        is_current: true,
        error: null,
      })
      .eq("id", jobId);

    return NextResponse.json({ id: jobId, status: "done", imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    await supabase
      .from("reconstruction_images")
      .update({ status: "failed", error: message.slice(0, 1000) })
      .eq("id", jobId);
    return NextResponse.json({ id: jobId, status: "failed", error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.org) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const siteId = searchParams.get("siteId");
  if (!id || !siteId) return NextResponse.json({ error: "id and siteId required" }, { status: 400 });

  const supabase = await createClient();
  const row = await supabase
    .from("reconstruction_images")
    .select("id, status, image_url, error, is_current, prompt_text, origin, provider, model")
    .eq("id", id)
    .eq("site_id", siteId)
    .maybeSingle();
  if (row.error || !row.data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(row.data);
}
