import { ArchiveBoard } from "@/components/studio/archive-board";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { versionsForOrg } from "@/server/publish-data";
import { redirect } from "next/navigation";

export default async function OrgArchivePage() {
  const session = await getSession();
  if (!session?.org) redirect("/login");
  const supabase = await createClient();
  const [versions, sites] = await Promise.all([
    versionsForOrg(session.org.orgId),
    supabase.from("sites").select("id, slug, name, status").eq("org_id", session.org.orgId).order("name"),
  ]);
  if (sites.error) throw new Error(sites.error.message);
  return (
    <div className="px-6 py-8 min-[1100px]:px-8">
      <ArchiveBoard
        title="Archive"
        versions={versions}
        sites={(sites.data ?? []).map((site) => ({
          id: site.id,
          slug: site.slug,
          name: site.name,
          status: site.status === "archived" ? "archived" : site.status === "published" ? "published" : "draft",
        }))}
      />
    </div>
  );
}
