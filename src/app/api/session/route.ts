import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ role: null, orgId: null }, { status: 401 });
  }
  return NextResponse.json({
    role: session.role,
    orgId: session.org?.orgId ?? null,
  });
}
