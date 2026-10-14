import { getSession } from "@/lib/auth/session";
import { zipStore } from "@/lib/zip-store";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ versionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { versionId } = await context.params;
  const supabase = await createClient();
  const version = await supabase.from("versions").select("number, snapshot, site_id").eq("id", versionId).maybeSingle();
  if (version.error || !version.data) return NextResponse.json({ error: "Version not found." }, { status: 404 });
  const assets = await supabase.from("assets").select("filename, storage_path, kind, bytes").eq("site_id", version.data.site_id);
  const encoder = new TextEncoder();
  const archive = zipStore([
    { name: "snapshot.json", data: encoder.encode(JSON.stringify(version.data.snapshot, null, 2)) },
    { name: "assets-manifest.json", data: encoder.encode(JSON.stringify(assets.data ?? [], null, 2)) },
  ]);
  return new NextResponse(Buffer.from(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="anvaya-${version.data.number}.zip"`,
    },
  });
}
