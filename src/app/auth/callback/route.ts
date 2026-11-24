import { createServerClient } from "@supabase/ssr";
import { destinationAfterAuth } from "@/lib/auth/account";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Completes Google OAuth / magic-link PKCE exchange and attaches session cookies
 * to the redirect response (required on Next.js App Router).
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

  // Hash tokens are only visible in the browser — hand off to the client page.
  if (!code && !tokenHash) {
    const hashPage = new URL("/auth/confirm", url.origin);
    for (const [key, value] of url.searchParams.entries()) {
      hashPage.searchParams.set(key, value);
    }
    return NextResponse.redirect(hashPage);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      new URL("/login?error=Auth%20is%20not%20configured", url.origin),
    );
  }

  const pending: CookieToSet[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          pending.push(cookie);
          request.cookies.set(cookie.name, cookie.value);
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

  const fail = (message: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url.origin),
    );
    for (const { name, value, options } of pending) {
      response.cookies.set(name, value, options);
    }
    return response;
  };

  if (authError) return fail(authError);

  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Could not establish a session");

  // Ensure profile + org membership for first Google sign-in (admin bypasses RLS).
  const admin = createAdminClient();
  const displayName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email?.split("@")[0] ??
    "Member";
  await admin.from("profiles").upsert(
    {
      id: data.user.id,
      name: displayName,
      initials: displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      title: "Member",
    },
    { onConflict: "id" },
  );

  const membership = await admin
    .from("org_members")
    .select("org_id", { count: "exact", head: true })
    .eq("user_id", data.user.id);

  let memberships = membership.count ?? 0;
  if (memberships === 0) {
    const { error: memberError } = await admin.from("org_members").insert({
      org_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0010",
      user_id: data.user.id,
      role: "owner",
    });
    if (!memberError) memberships = 1;
  }

  const destination = destinationAfterAuth({
    memberships,
    next,
  });

  const response = NextResponse.redirect(new URL(destination, url.origin));
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  return response;
}
