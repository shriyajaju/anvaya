import { createClient } from "@/lib/supabase/server";
import { destinationAfterAuth } from "@/lib/auth/account";
import { getSession } from "@/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email" | "signup" | "invite",
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  } else {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const session = await getSession();
  const destination = destinationAfterAuth({
    memberships: session?.organisations.length ?? 0,
    next,
  });
  return NextResponse.redirect(new URL(destination, url.origin));
}
