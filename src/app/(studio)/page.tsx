import { getSession, listOrgSwitcherItems } from "@/lib/auth/session";
import { signOut, switchOrganisation } from "@/server/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleReadout } from "./role-readout";

export default async function StudioHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgs = await listOrgSwitcherItems();

  return (
    <main className="min-h-screen bg-page px-8 py-12">
      <section className="mx-auto w-full max-w-[640px] rounded-card border border-border bg-surface p-8 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">Studio</p>
        <h1 className="mt-2 text-[32px] font-light leading-10 text-text-1">
          {session.profile.name}
        </h1>
        <p className="mt-1 text-[15px] text-text-2">
          {session.org ? `${session.org.name} · ${session.role}` : "No organisation yet"}
        </p>
        <RoleReadout />
        {orgs.length > 1 ? (
          <div className="mt-6 flex flex-col gap-2">
            {orgs.map((org) => (
              <form key={org.orgId} action={switchOrganisation}>
                <input type="hidden" name="orgId" value={org.orgId} />
                <button
                  type="submit"
                  className="text-left text-[13px] text-text-1"
                  aria-current={org.current ? "true" : undefined}
                >
                  {org.name}
                  {org.current ? " · current" : ""}
                </button>
              </form>
            ))}
          </div>
        ) : null}
        <div className="mt-8 flex items-center gap-4">
          <Link href="/settings/members" className="text-[13px] font-medium text-accent">
            Members
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-[13px] text-text-2">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
