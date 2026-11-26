import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";

const origin = process.env.NEXT_PUBLIC_VISITOR_URL ?? "https://anvaya.site";

/** Single PNG QR for a site (optional ?v=version & ?l=location). */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session?.org) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const { slug } = await context.params;
  const supabase = await createClient();
  const site = await supabase
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .eq("org_id", session.org.orgId)
    .maybeSingle();
  if (!site.data) return NextResponse.json({ error: "Site not found." }, { status: 404 });

  const version = request.nextUrl.searchParams.get("v");
  const location = request.nextUrl.searchParams.get("l");
  const url = new URL(`${origin.replace(/\/$/, "")}/${slug}`);
  if (version) url.searchParams.set("v", version);
  if (location) url.searchParams.set("l", location);

  const png = await QRCode.toBuffer(url.toString(), { type: "png", width: 512, margin: 1 });
  return new NextResponse(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
