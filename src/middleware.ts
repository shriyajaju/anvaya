import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStudioPath } from "@/lib/auth/account";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // OAuth / magic-link often lands on Site URL (/) with ?code=…
  // Never send that to /login without the code — forward to the callback instead.
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const onAuthRoute = request.nextUrl.pathname.startsWith("/auth/");
  if ((code || tokenHash) && !onAuthRoute) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    return NextResponse.redirect(callback);
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers ?? {})) {
          supabaseResponse.headers.set(header, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user && isStudioPath(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (request.nextUrl.pathname !== "/") {
      login.searchParams.set("next", request.nextUrl.pathname);
    }
    const redirectResponse = NextResponse.redirect(login);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|ico)$).*)",
  ],
};
