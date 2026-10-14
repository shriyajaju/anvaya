import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { OrganisationForm } from "./organisation-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.organisations.length > 0) redirect("/");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 py-16">
      <OrganisationForm error={params.error} />
    </main>
  );
}
