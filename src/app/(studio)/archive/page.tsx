import { ArchiveBoard } from "@/components/studio/archive-board";
import { getSession } from "@/lib/auth/session";
import { versionsForOrg } from "@/server/publish-data";
import { redirect } from "next/navigation";

export default async function OrgArchivePage() {
  const session = await getSession();
  if (!session?.org) redirect("/login");
  const versions = await versionsForOrg(session.org.orgId);
  return (
    <div className="px-6 pb-10">
      <ArchiveBoard title="Archive" versions={versions} />
    </div>
  );
}
