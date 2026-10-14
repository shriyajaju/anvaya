import { DocumentBoard } from "@/components/studio/document-board";
import { EvidenceBoard } from "@/components/studio/evidence-board";
import { OverviewBoard } from "@/components/studio/overview-board";
import { PlaceholderCards } from "@/components/studio/placeholder-cards";
import { TimelineBoard } from "@/components/studio/timeline-board";
import { getSession } from "@/lib/auth/session";
import { SITE_STEPS, WIDE_STEPS, isSiteStep } from "@/lib/studio/steps";
import { getOrgSite, stepStatusForSite } from "@/server/studio";
import { evidenceForSite, type SourceKind } from "@/server/evidence-data";
import { documentForSite, overviewForSite } from "@/server/workspace";
import { notFound, redirect } from "next/navigation";

export default async function SiteStepPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ slug: string; step: string }>;
  searchParams: Promise<{ kind?: string }>;
}>) {
  const { slug, step } = await params;
  if (!isSiteStep(step)) notFound();
  const session = await getSession();
  if (!session?.org) redirect("/login");
  const site = await getOrgSite(session.org.orgId, slug);
  if (!site) notFound();

  if (step === "overview") {
    const complete = await stepStatusForSite(site);
    const data = await overviewForSite(site.id, complete);
    return <OverviewBoard slug={slug} data={data} />;
  }
  if (step === "document") {
    const data = await documentForSite(site.id, slug);
    return <DocumentBoard data={data} />;
  }
  if (step === "timeline") return <TimelineBoard />;
  if (step === "evidence") {
    const query = await searchParams;
    const kinds = ["physical", "archaeological", "historical", "comparative", "visual", "scholarly"];
    const preset = kinds.includes(query.kind ?? "") ? (query.kind as SourceKind) : undefined;
    const data = await evidenceForSite(site.id, slug);
    return <EvidenceBoard data={data} presetKind={preset} />;
  }

  const label = SITE_STEPS.find((item) => item.id === step)?.label ?? step;
  const wide = WIDE_STEPS.includes(step);
  return (
    <PlaceholderCards
      title={label}
      note={
        wide
          ? "This step uses the wide workspace. The preview panel returns on the other steps."
          : "Placeholder for this step. The live visitor preview is on the right."
      }
    />
  );
}
