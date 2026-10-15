import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ExportPage() {
  const session = await requireRole(["owner", "admin", "creator", "reviewer", "viewer"]);
  const supabase = await createClient();
  const sites = await supabase.from("sites").select("id, slug, name").eq("org_id", session.org?.orgId ?? "");
  const ids = (sites.data ?? []).map((site) => site.id);
  const versions = ids.length
    ? await supabase.from("versions").select("id, site_id, number").in("site_id", ids).order("published_at", { ascending: false })
    : { data: [] };
  const names = new Map((sites.data ?? []).map((site) => [site.id, site]));
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <h1 className="text-[32px] font-light leading-10">Export</h1>
      <section className="rounded-card bg-surface p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Published versions</h2>
        <ul className="mt-3">
          {(versions.data ?? []).map((version) => {
            const site = names.get(version.site_id);
            return (
              <li key={version.id} className="flex items-center justify-between border-b border-border py-3 text-[15px]">
                <span>{site?.name} · {version.number}</span>
                <span className="flex gap-3 text-[13px]">
                  <a href={`/api/export/${version.id}`}>JSON-LD</a>
                  <a href={`/api/archive/${version.id}`}>Zip</a>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-card bg-surface p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Working copy</h2>
        <ul className="mt-3">
          {(sites.data ?? []).map((site) => (
            <li key={site.id} className="flex items-center justify-between border-b border-border py-3">
              <span>{site.name}</span>
              <a href={`/api/export/working/${site.slug}`} className="text-[13px]">JSON</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
