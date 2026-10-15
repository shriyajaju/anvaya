import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { slug } = await context.params;
  const supabase = await createClient();
  const site = await supabase.from("sites").select("id, slug").eq("slug", slug).maybeSingle();
  if (!site.data) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const snapshot = await supabase.rpc("snapshot_site", { p_site_id: site.data.id });
  if (snapshot.error || !snapshot.data) return NextResponse.json({ error: snapshot.error?.message ?? "No working copy." }, { status: 400 });
  const stories = await supabase.from("stories").select("id, title, category, summary, status, duration_s, sort, story_steps(id, title, location_id, body, audio_asset_id, element_id, source_ids, trigger, sort)").eq("site_id", site.data.id);
  const body = { ...(snapshot.data as Record<string, unknown>), stories: stories.data ?? [] };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slug}-working.json"`,
    },
  });
}
