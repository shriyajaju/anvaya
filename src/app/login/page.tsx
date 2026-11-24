import { authAllowlist, destinationAfterAuth, isDummyLoginEnabled } from "@/lib/auth/account";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { LoginVisitorPreview } from "./visitor-preview";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) {
    redirect(
      destinationAfterAuth({ memberships: session.organisations.length, next: params.next ?? null }),
    );
  }

  return (
    <main className="flex min-h-screen bg-page">
      <LoginVisitorPreview />
      <section className="relative flex w-full flex-col items-center justify-center overflow-hidden border-border bg-white px-6 py-16 lg:w-[648px] lg:shrink-0 lg:border-l lg:border-[#e2e6e9]">
        <LoginForm
          error={params.error}
          next={params.next}
          sent={params.sent === "1"}
          allowlist={authAllowlist()}
          dummyLogin={isDummyLoginEnabled()}
        />
        <p className="absolute bottom-16 left-1/2 w-full max-w-[400px] -translate-x-1/2 translate-y-full text-center text-[13px] text-[#778188]">
          Terms · Privacy · Support
        </p>
      </section>
    </main>
  );
}
