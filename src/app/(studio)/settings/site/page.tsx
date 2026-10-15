import { ArchiveSite, SiteRulesForm } from "@/components/studio/settings-forms";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SiteRulesPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const session = await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  const query = await searchParams;
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name, status, require_review, settings").eq("org_id", session.org?.orgId ?? "").order("name");
  const list = sites.data ?? [];
  const site = list.find((item) => item.slug === query.site) ?? list[0];
  if (!site) return <p>No sites in this organisation.</p>;
  const settings = (site.settings ?? {}) as Record<string, boolean>;
  const canEdit = session.role === "owner" || session.role === "admin";
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <h1 className="text-[32px] font-light leading-10">Site rules</h1>
      <div className="flex flex-wrap gap-2">
        {list.map((item) => (
          <Link key={item.id} href={`?site=${item.slug}`} className={`rounded-pill px-3 py-1 text-[13px] ${item.id === site.id ? "bg-primary text-on-primary" : "bg-surface text-text-2"}`}>{item.name}</Link>
        ))}
      </div>
      <SiteRulesForm
        siteId={site.id}
        requireReview={site.require_review !== false}
        showAssumptions={settings.showAssumptions !== false}
        showAlternatives={settings.showAlternatives !== false}
        collectFeedback={settings.collectFeedback !== false}
        requireSourceForHigh={settings.requireSourceForHigh !== false}
        canEdit={canEdit}
      />
      {canEdit && site.status !== "archived" ? <ArchiveSite siteId={site.id} name={site.name} /> : null}
      {site.status === "archived" ? <p className="text-[13px] text-text-2">This site is archived.</p> : null}
    </div>
  );
}
