import { createServerClient } from "@supabase/ssr";
import { destinationAfterAuth } from "@/lib/auth/account";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Email magic links land here with ?code= (PKCE) or ?token_hash=&type=.
 * Session cookies must be copied onto the redirect response or the user
 * appears signed-out and is sent back to /login.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const errorDescription =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, url.origin),
    );
  }

  // Implicit flow keeps tokens in the URL hash (server cannot read them).
  if (!code && !tokenHash) {
    const hashPage = new URL("/auth/confirm", url.origin);
    if (next) hashPage.searchParams.set("next", next);
    return NextResponse.redirect(hashPage);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      new URL("/login?error=Auth%20is%20not%20configured", url.origin),
    );
  }

  const pendingCookies: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] =
    [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          pendingCookies.push(cookie);
        }
      },
    },
  });

  let authError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) authError = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email" | "signup" | "invite" | "recovery" | "email_change",
    });
    if (error) authError = error.message;
  }

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, url.origin),
    );
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.redirect(
      new URL("/login?error=Could%20not%20establish%20a%20session", url.origin),
    );
  }

  const { count } = await supabase
    .from("org_members")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", data.user.id);

  const destination = destinationAfterAuth({
    memberships: count ?? 0,
    next,
  });

  const response = NextResponse.redirect(new URL(destination, url.origin));
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
