import { SiteFrame } from "@/components/studio/site-frame";
import { getSession } from "@/lib/auth/session";
import { signPreviewToken } from "@/lib/preview-token";
import { getOrgSite, listOrgSites, stepStatusForSite } from "@/server/studio";
import { pinsForSite, previewCaption, timelineForSite } from "@/server/workspace";
import { notFound, redirect } from "next/navigation";

export default async function SiteWorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.org) redirect("/onboarding");

  const site = await getOrgSite(session.org.orgId, slug);
  if (!site) notFound();
  const [sites, complete, pins, timeline, caption] = await Promise.all([
    listOrgSites(session.org.orgId),
    stepStatusForSite(site),
    pinsForSite(site.id),
    timelineForSite(site.id, site.slug),
    previewCaption(site.id),
  ]);

  return (
    <SiteFrame
      slug={site.slug}
      name={site.name}
      location={site.location}
      revision={site.updatedAt}
      previewToken={signPreviewToken({ slug: site.slug, siteId: site.id })}
      sites={sites.map((item) => ({ slug: item.slug, name: item.name }))}
      complete={complete}
      pins={pins}
      timeline={timeline}
      caption={caption}
    >
      {children}
    </SiteFrame>
  );
}
