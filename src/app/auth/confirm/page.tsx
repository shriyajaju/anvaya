"use client";

import { createClient } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const next = params.get("next") || "/";

    async function finish() {
      let supabase: ReturnType<typeof createClient>;
      try {
        supabase = createClient();
      } catch {
        router.replace("/login?error=Auth%20is%20not%20configured");
        return;
      }

      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        router.replace(next.startsWith("/") ? next : "/");
        router.refresh();
        return;
      }

      if (code) {
        // Prefer the server callback for PKCE (code verifier lives in httpOnly cookies).
        window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
        return;
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "magiclink" | "email" | "signup" | "invite" | "recovery" | "email_change",
        });
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        router.replace(next.startsWith("/") ? next : "/");
        router.refresh();
        return;
      }

      router.replace("/login?error=Sign-in%20link%20was%20missing%20tokens.%20Request%20a%20new%20email.");
    }

    void finish();
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6">
      <p className="text-[15px] text-text-2">{message}</p>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-page px-6">
          <p className="text-[15px] text-text-2">Signing you in…</p>
        </main>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
