import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

type Body = { siteId: string; number: string; note: string };

Deno.serve(async (request) => {
  const body = (await request.json()) as Body;
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = request.headers.get("Authorization") ?? "";
  const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service);
  const allowed = await user.rpc("can_publish", { p_site_id: body.siteId });
  if (!allowed.data) return Response.json({ error: "CANNOT_PUBLISH" }, { status: 403 });
  const site = await user.from("sites").select("slug").eq("id", body.siteId).single();
  if (site.error || !site.data) return Response.json({ error: "Site not found." }, { status: 404 });
  await user.from("stories").update({ status: "published" }).eq("site_id", body.siteId).eq("status", "approved");
  const published = await user.rpc("publish_site", { p_site_id: body.siteId, p_number: body.number, p_note: body.note });
  if (published.error) return Response.json({ error: published.error.message }, { status: 400 });
  const assets = await admin.from("assets").select("storage_path, filename").eq("site_id", body.siteId);
  for (const asset of assets.data ?? []) {
    const storagePath = asset.storage_path as string;
    if (storagePath.startsWith("seed-models/")) continue;
    const file = await admin.storage.from("assets").download(storagePath);
    if (!file.data) continue;
    const filename = (asset.filename as string) || storagePath.split("/").pop() || "file";
    await admin.storage.from("published").upload(`${body.siteId}/${filename}`, await file.data.arrayBuffer(), { upsert: true });
  }
  const slug = site.data.slug as string;
  const origin = Deno.env.get("VISITOR_ORIGIN") ?? "https://anvaya.site";
  const locations = await admin.from("locations").select("qr_code, name").eq("site_id", body.siteId);
  const codes = [
    { name: "site", target: `${origin}/${slug}` },
    ...(locations.data ?? []).map((location) => {
      const code = String(location.qr_code ?? location.name).split("-").pop();
      return { name: String(code), target: `${origin}/${slug}?l=${code}` };
    }),
  ];
  // Viewpoint QRs open the reconstruction camera overlay for the primary linked element.
  const viewpoints = await admin
    .from("assets")
    .select("id, viewpoint_label")
    .eq("site_id", body.siteId)
    .eq("kind", "photo")
    .not("viewpoint_label", "is", null);
  const recon = await admin
    .from("reconstruction_images")
    .select("id, source_photo_id, element_ids")
    .eq("site_id", body.siteId)
    .eq("is_current", true)
    .eq("status", "done")
    .maybeSingle();
  for (const viewpoint of viewpoints.data ?? []) {
    const elementId = ((recon.data?.element_ids as string[] | null) ?? [])[0];
    if (!elementId) continue;
    if (recon.data?.source_photo_id && recon.data.source_photo_id !== viewpoint.id) continue;
    codes.push({
      name: `viewpoint-${String(viewpoint.id).slice(0, 8)}`,
      target: `${origin}/${slug}/ar/${elementId}?camera=1`,
    });
  }
  for (const code of codes) {
    const png = await QRCode.toBuffer(code.target, { type: "png", width: 512, margin: 1 });
    const svg = await QRCode.toString(code.target, { type: "svg" });
    await admin.storage.from("published").upload(`qr/${slug}/${code.name}.png`, png, { upsert: true, contentType: "image/png" });
    await admin.storage.from("published").upload(`qr/${slug}/${code.name}.svg`, new TextEncoder().encode(svg), {
      upsert: true,
      contentType: "image/svg+xml",
    });
  }
  return Response.json({ versionId: published.data, number: body.number });
});
