import { authAllowlist, destinationAfterAuth } from "@/lib/auth/account";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) {
    redirect(destinationAfterAuth({ memberships: session.organisations.length, next: params.next ?? null }));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-16">
      <LoginForm
        error={params.error}
        next={params.next}
        sent={params.sent === "1"}
        allowlist={authAllowlist()}
      />
    </main>
  );
}
