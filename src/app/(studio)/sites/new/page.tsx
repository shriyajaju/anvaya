import { NewSiteWizard } from "@/app/(studio)/sites/new/wizard";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewSitePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string }>;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.org) redirect("/onboarding");
  const { error } = await searchParams;
  return (
    <div className="px-6 py-12">
      <NewSiteWizard canInvite={session.role === "owner" || session.role === "admin"} error={error} />
    </div>
  );
}
