import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ versionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { versionId } = await context.params;
  const supabase = await createClient();
  const version = await supabase.from("versions").select("number, snapshot").eq("id", versionId).maybeSingle();
  if (!version.data) return NextResponse.json({ error: "Version not found." }, { status: 404 });
  const snapshot = version.data.snapshot as { site?: { name?: string; location?: string | null; description?: string | null } };
  const site = snapshot.site ?? {};
  const body = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: site.name ?? "Site",
    description: site.description,
    address: site.location,
    version: version.data.number,
    isBasedOn: snapshot,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/ld+json",
      "Content-Disposition": `attachment; filename="anvaya-${version.data.number}.jsonld"`,
    },
  });
}
