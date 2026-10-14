import { Greeting } from "@/components/studio/greeting";
import { PreviewPanel } from "@/components/studio/preview-panel";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { ProgressBar } from "@/components/ui/bars";
import { Row } from "@/components/ui/row";
import { dashboardForOrg, type AttentionItem } from "@/server/studio";
import { getSession } from "@/lib/auth/session";
import { FileText, FolderOpen, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function attentionDot(level: AttentionItem["level"]) {
  if (level === "medium") return "Medium" as const;
  if (level === "review") return "Review" as const;
  return "Low" as const;
}

function editedAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `edited ${minutes} m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `edited ${hours} h ago`;
  return `edited ${Math.round(hours / 24)} d ago`;
}

export default async function StudioHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.org) redirect("/onboarding");
  const board = await dashboardForOrg(session.org.orgId);
  const items = board.attention.length;
  const summary = `${board.inProgress} ${board.inProgress === 1 ? "site" : "sites"} in progress · ${items} ${
    items === 1 ? "item needs" : "items need"
  } your attention`;
  const current = board.continueSite;

  return (
    <div className="min-[1100px]:grid min-[1100px]:grid-cols-2 min-[1100px]:items-start">
      <div className="flex max-w-[600px] flex-col gap-8 px-6 py-12">
        <div>
          <Greeting name={session.profile.name} />
          <p className="mt-2 text-[15px] leading-6 text-text-2">{summary}</p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Start</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link href="/sites/new" className="block">
              <Card className="relative h-[120px] overflow-hidden">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-4 -top-14 block size-[200px] bg-contain bg-no-repeat"
                  style={{ backgroundImage: "url(/blobs/violet-glow.svg)" }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-6 block size-[200px] bg-contain bg-no-repeat"
                  style={{ backgroundImage: "url(/blobs/pink-glow.svg)" }}
                />
                <span className="flex h-[88px] flex-col justify-between">
                  <IconTile>
                    <Home className="size-5" />
                  </IconTile>
                  <span className="text-[18px] font-medium leading-[26px]">Create a new site</span>
                </span>
              </Card>
            </Link>
            <Link href={current ? `/s/${current.slug}/evidence` : "/sites"} className="block">
              <Card className="h-[120px]">
                <span className="flex h-[88px] flex-col justify-between">
                  <IconTile>
                    <FileText className="size-5" />
                  </IconTile>
                  <span className="text-[18px] font-medium leading-[26px]">Upload evidence</span>
                </span>
              </Card>
            </Link>
            <Link href={current ? `/s/${current.slug}/${current.step}` : "/sites"} className="block">
              <Card className="h-[120px]">
                <span className="flex h-[88px] flex-col justify-between">
                  <IconTile>
                    <FolderOpen className="size-5" />
                  </IconTile>
                  <span className="text-[18px] font-medium leading-[26px]">Continue working</span>
                </span>
              </Card>
            </Link>
          </div>
        </section>

        {current ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Continue working</h2>
            <Card>
              <Link href={`/s/${current.slug}/${current.step}`}>
                <Row
                  title={current.name}
                  meta={`${current.location ?? "Location not set"} · ${editedAgo(current.updatedAt)}`}
                  dot="None"
                  divider={false}
                  leading={<span className="size-14 shrink-0 rounded-button bg-surface-2" />}
                  trailing={
                    <span className="flex items-center gap-3">
                      <span className="flex w-[120px] flex-col gap-1">
                        <span className="inline-flex h-6 items-center self-start rounded-pill bg-surface-2 px-2.5 text-[13px] leading-5 text-text-2">
                          {current.stepLabel}
                        </span>
                        <span className="text-[13px] leading-5 text-text-2">{current.percent}%</span>
                        <ProgressBar percent={current.percent} className="w-[120px]" />
                      </span>
                      <ChevronRight aria-hidden className="size-4 text-text-3" />
                    </span>
                  }
                />
              </Link>
            </Card>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Needs your attention</h2>
          <Card>
            {board.attention.length === 0 ? (
              <p className="text-[15px] leading-6 text-text-2">Nothing needs attention.</p>
            ) : (
              board.attention.map((item, index) => (
                <Link key={`${item.kind}-${item.targetId}`} href={`/s/${item.slug}/${item.step}`}>
                  <Row
                    title={item.title}
                    meta={item.meta}
                    dot={attentionDot(item.level)}
                    divider={index < board.attention.length - 1}
                  />
                </Link>
              ))
            )}
            <div className="mt-3">
              <Link href="/review-queue" className="text-[13px] font-medium text-accent">
                View review queue
              </Link>
            </div>
          </Card>
        </section>
      </div>

      {current ? (
        <div className="hidden px-6 py-6 min-[1100px]:block">
          <div className="sticky top-6 h-[calc(100vh-48px)]">
            <PreviewPanel
              slug={current.slug}
              name={current.name}
              location={current.location}
              description={current.description}
              revision={current.updatedAt}
              previewToken={current.previewToken}
              watermark={!current.published}
              openLabel={current.name}
              caption={`${current.version ? `Version ${current.version}` : "Not published"} · ${current.scansThisWeek} scans this week`}
              stats={{ elements: current.elements, sources: current.sources, stories: current.stories }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
