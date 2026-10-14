import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Rail } from "@/components/studio/rail";
import { getSession } from "@/lib/auth/session";
import { signPreviewToken } from "@/lib/preview-token";
import { getOrgSite, openReviewCount } from "@/server/studio";

export default async function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const path = (await headers()).get("x-pathname") ?? "";
  if (session && session.organisations.length === 0 && path !== "/onboarding") {
    redirect("/onboarding");
  }

  const bare = !session || path === "/onboarding" || path.startsWith("/kitchen-sink");
  if (bare || !session) return children;

  const slugMatch = path.match(/^\/s\/([^/]+)/);
  const slug = slugMatch?.[1] ? decodeURIComponent(slugMatch[1]) : null;
  let previewToken: string | null = null;
  if (slug && session.org) {
    const site = await getOrgSite(session.org.orgId, slug);
    if (site) previewToken = signPreviewToken({ slug: site.slug, siteId: site.id });
  }

  const reviewCount = session.org
    ? await openReviewCount({
        orgId: session.org.orgId,
        userId: session.userId,
        role: session.role,
      })
    : 0;

  return (
    <div className="min-h-screen bg-page pb-[88px] text-text-1 min-[1100px]:pb-0 min-[1100px]:pl-[120px]">
      <Rail
        name={session.profile.name}
        initials={session.profile.initials ?? "AN"}
        title={session.profile.title}
        orgs={session.organisations.map((org) => ({
          orgId: org.orgId,
          name: org.name,
          current: org.orgId === session.org?.orgId,
        }))}
        reviewCount={reviewCount}
        siteSlug={previewToken ? slug : null}
        previewToken={previewToken}
      />
      {children}
    </div>
  );
}
