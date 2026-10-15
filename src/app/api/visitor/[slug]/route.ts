import { getSnapshot } from "@/server/visitor";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const snapshot = await getSnapshot(slug);
  if (!snapshot) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(snapshot);
}
