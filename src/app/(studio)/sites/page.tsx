import { SitesBoard } from "@/components/studio/sites-board";
import { getSession } from "@/lib/auth/session";
import { siteCardsForOrg } from "@/server/studio";
import { redirect } from "next/navigation";

export default async function SitesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.org) redirect("/onboarding");
  const board = await siteCardsForOrg(session.org.orgId);
  return <SitesBoard sites={board.sites} members={board.members} />;
}
