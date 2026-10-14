"use client";

import { DEV_ACCOUNTS } from "@/lib/auth/account";
import { requestMagicLink, signInAsDev, signInWithGoogle } from "@/server/auth";
import { useState } from "react";

export function LoginForm({
  error,
  next,
  sent,
}: {
  error?: string;
  next?: string;
  sent: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(sent ? "Check your email for a sign-in link." : null);
  const [formError, setFormError] = useState<string | null>(error ?? null);

  return (
    <section className="w-full max-w-[440px] rounded-card border border-border bg-surface px-10 py-12 shadow-card">
      <p className="text-[20px] font-semibold tracking-[0.08em] text-text-1">ANVAYA</p>
      <div className="pt-10">
        <h1 className="text-[40px] font-light leading-[1.12] tracking-[-0.02em] text-text-1">
          Welcome back
        </h1>
        <p className="mt-2.5 text-[16px] leading-[1.5] text-text-2">
          Sign in to your heritage workspace.
        </p>
      </div>

      <form
        className="pt-8"
        action={async (formData) => {
          setPending(true);
          setFormError(null);
          const result = await requestMagicLink(formData);
          setPending(false);
          if (!result.ok) {
            setFormError(result.error);
            return;
          }
          setMessage("Check your email for a sign-in link.");
        }}
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="flex h-[72px] flex-col gap-[7px] rounded-card border border-border bg-surface px-4 py-3 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@organisation.org"
            className="bg-transparent text-[16px] text-text-1 outline-none placeholder:text-text-2"
          />
        </label>
        {formError ? (
          <p className="pt-3 text-[13px] text-conf-low" role="alert">
            {formError}
          </p>
        ) : null}
        {message ? <p className="pt-3 text-[13px] text-accent">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-button border border-primary bg-primary text-[12px] font-semibold tracking-[0.1em] text-on-primary disabled:opacity-60"
        >
          {pending ? "SENDING" : "SIGN IN"}
        </button>
      </form>

      <div className="flex items-center gap-3.5 py-6">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[13px] text-text-3">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-button border border-border bg-surface text-[12px] font-semibold tracking-[0.1em] text-text-1 shadow-card"
        >
          CONTINUE WITH GOOGLE
        </button>
      </form>

      <p className="pt-6 text-center text-[13px] text-text-2">
        New here? <span className="font-medium text-accent">Create an organisation</span>
      </p>
      <p className="pt-10 text-center text-[13px] text-text-3">Terms · Privacy · Support</p>

      {process.env.NODE_ENV === "development" ? (
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
            Development
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <form key={account.email} action={signInAsDev}>
                <input type="hidden" name="email" value={account.email} />
                <button
                  type="submit"
                  className="flex h-10 w-full items-center justify-center rounded-button border border-border text-[13px] text-text-1"
                >
                  Sign in as {account.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
