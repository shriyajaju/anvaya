import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { NextResponse } from "next/server";

const origin = process.env.NEXT_PUBLIC_VISITOR_URL ?? "https://anvaya.site";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session?.org) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { slug } = await context.params;
  const supabase = await createClient();
  const site = await supabase.from("sites").select("id, name").eq("slug", slug).eq("org_id", session.org.orgId).maybeSingle();
  if (!site.data) return NextResponse.json({ error: "Site not found." }, { status: 404 });
  const locations = await supabase.from("locations").select("name, qr_code").eq("site_id", site.data.id).order("name");
  const codes = [
    { label: site.data.name as string, url: `${origin}/${slug}` },
    ...(locations.data ?? []).map((location) => {
      const code = String(location.qr_code ?? location.name).split("-").pop();
      return { label: location.name as string, url: `${origin}/${slug}?l=${code}` };
    }),
  ];
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  page.drawText(`${site.data.name} · location codes`, { x: 48, y: 800, size: 18, font, color: rgb(0.07, 0.07, 0.07) });
  let y = 740;
  for (const code of codes) {
    const png = await QRCode.toBuffer(code.url, { type: "png", width: 256, margin: 1 });
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 48, y: y - 120, width: 120, height: 120 });
    page.drawText(code.label, { x: 184, y: y - 40, size: 14, font });
    page.drawText(code.url.replace("https://", ""), { x: 184, y: y - 62, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 150;
    if (y < 160) break;
  }
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="anvaya-${slug}-qr.pdf"`,
    },
  });
}
