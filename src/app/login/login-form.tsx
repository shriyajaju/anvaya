"use client";

import { DEV_ACCOUNTS } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/browser";
import {
  requestPasswordReset,
  signInAllowlisted,
  signInAsDev,
  signInDummy,
  signInWithGoogle,
  signInWithPassword,
} from "@/server/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm({
  error,
  next,
  allowlist = [],
  dummyLogin = false,
}: {
  error?: string;
  next?: string;
  sent?: boolean;
  allowlist?: string[];
  dummyLogin?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(error ?? null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.includes("access_token")) return;
    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    void (async () => {
      try {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setFormError(sessionError.message);
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        router.replace(next && next.startsWith("/") ? next : "/");
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not sign in");
      }
    })();
  }, [next, router]);

  return (
    <div className="relative flex w-full max-w-[400px] flex-col">
      <p className="w-full text-[20px] font-semibold tracking-[0.08em] text-[#121212]">ANVAYA</p>

      <div className="flex w-full flex-col gap-2.5 pt-10">
        <h1 className="w-full text-[40px] font-light leading-[1.12] tracking-[-0.02em] text-[#121212]">
          Welcome back
        </h1>
        <p className="w-full text-[16px] leading-[1.5] text-[#778188]">
          Sign in to your heritage workspace.
        </p>
      </div>

      <form
        className="flex w-full flex-col gap-4 pt-8"
        action={async (formData) => {
          setPending(true);
          setFormError(null);
          setMessage(null);
          if (dummyLogin) {
            await signInDummy(formData);
            return;
          }
          const result = await signInWithPassword(formData);
          setPending(false);
          if (result && !result.ok) {
            setFormError(result.error);
          }
        }}
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <label className="flex h-[72px] w-full flex-col gap-[7px] rounded-card border border-[#e2e6e9] bg-white px-4 py-3 shadow-[0px_8px_24px_0px_rgba(17,17,17,0.04)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#778188]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required={!dummyLogin}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={dummyLogin ? "a.iyer@anvaya.test" : "name@organisation.org"}
            className="bg-transparent text-[16px] text-[#121212] outline-none placeholder:text-[#778188]"
          />
        </label>

        <label className="flex h-[72px] w-full flex-col gap-[7px] rounded-card border border-[#e2e6e9] bg-white px-4 py-3 shadow-[0px_8px_24px_0px_rgba(17,17,17,0.04)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#778188]">
            Password
          </span>
          <span className="flex items-center justify-between gap-3">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required={!dummyLogin}
              autoComplete="current-password"
              placeholder="••••••••••"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[#121212] outline-none placeholder:text-[#778188]"
            />
            <button
              type="button"
              className="shrink-0 p-0.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/login/eye.svg" alt="" className="size-[17px] max-w-none" />
            </button>
          </span>
        </label>

        {formError ? (
          <p className="text-[13px] text-conf-low" role="alert">
            {formError}
          </p>
        ) : null}
        {message ? <p className="text-[13px] text-[#149020]">{message}</p> : null}

        <div className="flex w-full justify-end pt-3">
          <button
            type="button"
            className="text-[14px] font-medium text-[#149020] disabled:opacity-40"
            disabled={dummyLogin}
            onClick={async () => {
              setFormError(null);
              setMessage(null);
              const data = new FormData();
              data.set("email", email);
              const result = await requestPasswordReset(data);
              if (!result.ok) {
                setFormError(result.error);
                return;
              }
              setMessage("Password reset email sent — check your inbox.");
            }}
          >
            Forgot password?
          </button>
        </div>

        <div className="w-full pt-5">
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center rounded-button border border-[#121212] bg-[#121212] text-[14px] font-bold tracking-[0.1em] text-white disabled:opacity-60"
          >
            {pending ? "SIGNING IN" : "Sign In"}
          </button>
        </div>
      </form>

      <div className="flex w-full items-center gap-3.5 py-6">
        <span className="h-px flex-1 bg-[#e2e6e9]" />
        <span className="text-[13px] text-[#778188]">or</span>
        <span className="h-px flex-1 bg-[#e2e6e9]" />
      </div>

      <form action={dummyLogin ? signInDummy : signInWithGoogle} className="w-full">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-button border border-[#e2e6e9] bg-white text-[14px] font-bold capitalize tracking-[0.1em] text-[#121212] shadow-[0px_8px_24px_0px_rgba(17,17,17,0.04)]"
        >
          Continue with SSO
        </button>
      </form>

      <p className="w-full pt-6 text-center text-[14px] text-[#778188]">
        New here?{" "}
        <span className="font-medium text-[#149020]">Create an organisation</span>
      </p>

      {allowlist.length > 0 ? (
        <div className="mt-8 w-full border-t border-[#e2e6e9] pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#778188]">
            Allowed access
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {allowlist.map((entry) => (
              <form key={entry} action={signInAllowlisted}>
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <input type="hidden" name="email" value={entry} />
                <button
                  type="submit"
                  className="flex h-10 w-full items-center justify-center rounded-button border border-[#e2e6e9] text-[13px] text-[#121212]"
                >
                  Continue as {entry}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      {process.env.NODE_ENV === "development" ? (
        <div className="mt-8 w-full border-t border-[#e2e6e9] pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#778188]">
            Development
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <form key={account.email} action={signInAsDev}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="flex h-10 w-full items-center justify-center rounded-button border border-[#e2e6e9] text-[13px] text-[#121212]"
                >
                  Sign in as {account.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
