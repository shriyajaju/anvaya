"use client";

import { DiffRows } from "@/components/studio/review-shared";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { focusRing } from "@/components/ui/motion";
import type { VersionCardData } from "@/server/publish-data";
import type { SceneElement } from "@/server/reconstruct-data";
import type { ReviewDiff } from "@/lib/studio/review";
import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type ArchiveSite = {
  id: string;
  slug: string;
  name: string;
  status: "published" | "archived" | "draft";
};

import { isImageReconstruction } from "@/lib/reconstruction/mode";

const SceneBuilder = dynamic(() => import("@/components/three/scene-builder").then((mod) => mod.SceneBuilder), { ssr: false });

export function ArchiveBoard({
  title,
  versions,
  sites,
  compare,
}: {
  title: string;
  versions: VersionCardData[];
  sites?: ArchiveSite[];
  compare?: {
    left: { id: string; number: string; publishedAt: string; elements: SceneElement[]; high: number; total: number; imageUrl?: string | null };
    right: { id: string; number: string; publishedAt: string; elements: SceneElement[]; high: number; total: number; imageUrl?: string | null };
    diff: ReviewDiff[];
    slug: string;
  } | null;
}) {
  const catalog = useMemo(() => sitesFrom(versions, sites), [sites, versions]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(catalog.find((site) => site.slug === "ajanta-cave-1")?.id ?? catalog[0]?.id ?? "");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filteredSites = catalog.filter((site) => {
    const own = versions.filter((version) => version.siteId === site.id);
    const haystack = `${site.name} ${own.map((version) => `${version.number} ${version.note}`).join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const selected = filteredSites.find((site) => site.id === selectedId) ?? filteredSites[0] ?? null;
  const timeline = versions.filter((version) => version.siteId === selected?.id);

  async function exportAll() {
    if (!timeline.length) return;
    setExporting(true);
    setError(null);
    for (const version of timeline) {
      const response = await fetch(`/api/archive/${version.id}`);
      if (!response.ok) {
        setError("A version package could not be downloaded.");
        setExporting(false);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anvaya-${selected?.slug ?? "site"}-${version.number}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  if (compare) return <CompareView compare={compare} />;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-light leading-[1.05] tracking-[-0.8px] text-text-1">{title}</h1>
          <p className="mt-[5px] text-[13px] text-text-2">Every published version, preserved with its evidence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-10 w-[280px] max-w-full items-center gap-2.5 rounded-button border border-border bg-surface px-3.5">
            <Search aria-hidden className="size-4 text-text-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search archive"
              className="w-full bg-transparent text-[13px] text-text-1 outline-none placeholder:text-text-3"
            />
          </label>
          <button
            type="button"
            disabled={!timeline.length || exporting}
            onClick={() => void exportAll()}
            className={`${focusRing} inline-flex h-10 w-[112px] items-center justify-center rounded-button border border-border bg-surface text-[11px] font-semibold tracking-[1.1px] text-text-1 shadow-[0_8px_24px_rgba(17,17,17,0.04)] disabled:opacity-40`}
          >
            {exporting ? "…" : "EXPORT ALL"}
          </button>
        </div>
      </header>
      {error ? <p className="mt-3 text-[13px] text-conf-low">{error}</p> : null}
      <div className="mt-[30px] flex flex-col items-start gap-8 min-[1100px]:flex-row min-[1100px]:gap-14">
        <section className="w-full max-w-[320px]">
          <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Sites</h2>
          <div className="mt-2.5 overflow-hidden rounded-card border border-border bg-surface shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
            {filteredSites.length === 0 ? <p className="px-4 py-5 text-[13px] text-text-2">No sites match this search.</p> : null}
            {filteredSites.map((site) => {
              const count = versions.filter((version) => version.siteId === site.id).length;
              const active = selected?.id === site.id;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedId(site.id)}
                  className={`relative flex h-[58px] w-full items-center justify-between border-b border-border px-4 pr-3.5 text-left last:border-b-0 ${active ? "bg-[#f1f1ee]" : "bg-surface"}`}
                >
                  {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" /> : null}
                  <span className={`text-[13px] ${active ? "font-semibold text-text-1" : site.status === "archived" ? "font-normal text-[#77746d]" : "font-normal text-text-1"}`}>
                    {site.name}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-text-2">
                    {site.status === "archived" ? <span className="rounded-pill bg-[#eceae5] px-2 py-1 text-[10px] font-medium text-[#77746d]">Archived</span> : null}
                    {count === 1 ? "1 version" : `${count} versions`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="relative min-w-0 flex-1 pl-10">
          <div className="absolute bottom-8 left-[5px] top-3 w-0.5 bg-[#d8d6d0]" />
          <ol className="flex flex-col gap-4">
            {timeline.map((version, index) => (
              <li key={version.id} className="relative">
                <span className="absolute -left-10 top-[18px] size-3 rounded-full border-2 border-[#4a5a2a] bg-[#4a5a2a]" />
                <VersionCard version={version} previous={timeline[index + 1]} current={index === 0 && selected?.status === "published"} />
              </li>
            ))}
            <li className="relative flex items-center gap-3 pt-2">
              <img src="/archive/future-node.png" alt="" width={12} height={12} className="absolute -left-10 top-3 size-3" />
              <p className="text-[11px] text-text-3">Future versions will appear here as knowledge evolves</p>
            </li>
          </ol>
          {timeline.length === 0 ? <p className="mb-4 max-w-[560px] text-[13px] text-text-2">Nothing has been published for this site yet.</p> : null}
        </section>
      </div>
    </div>
  );
}

function VersionCard({ version, previous, current }: { version: VersionCardData; previous?: VersionCardData; current: boolean }) {
  const compare = previous ? `/s/${version.slug}/archive?left=${previous.id}&right=${version.id}` : null;
  const total = version.high + version.medium + version.low;
  const qrSrc = `/api/qr/${version.slug}/png?v=${encodeURIComponent(version.number)}`;
  const visitorHref = `/${version.slug}?v=${encodeURIComponent(version.number)}`;
  const segments = [
    ...Array.from({ length: version.high }, () => "bg-[#4a5a2a]"),
    ...Array.from({ length: version.medium }, () => "bg-[#9a8150]"),
    ...Array.from({ length: version.low }, () => "bg-[#d8d6d0]"),
  ];
  return (
    <article className="flex min-h-[220px] w-full max-w-[560px] flex-col justify-between gap-3 rounded-card border border-border bg-surface p-5 shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[1px] text-text-2">
              Version {version.number} · Published {publishedLabel(version.publishedAt)}
            </p>
            {current ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-[#e7ebdd] px-[9px] py-[5px] text-[10px] font-medium text-[#4a5a2a]">
                <span className="size-[5px] rounded-full bg-[#4a5a2a]" />
                Current
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <h3 className="text-[18px] font-medium leading-[1.25] text-text-1">{version.note || "Published reconstruction"}</h3>
            <p className="mt-[5px] text-[11px] text-text-2">
              {countLabel(version.elements, "element")} · {countLabel(version.sources, "source")} · {countLabel(version.stories, "story")} · {countLabel(version.locations, "visitor location")}
            </p>
          </div>
        </div>
        <a
          href={visitorHref}
          target="_blank"
          rel="noreferrer"
          className="group flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-[10px] border border-border bg-page p-2 transition-shadow hover:shadow-card"
          title={`Scan to open version ${version.number}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for ${version.siteName} version ${version.number}`}
            width={72}
            height={72}
            className="size-[72px] rounded-md bg-white p-1"
          />
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-text-3 group-hover:text-text-2">
            Scan
          </span>
        </a>
      </div>
      <div>
        <div className="flex items-center justify-between text-[9px] font-semibold">
          <span className="uppercase tracking-[1.08px] text-text-3">Confidence</span>
          <span className="text-text-2">{version.high}/{Math.max(total, 1)} high</span>
        </div>
        <div className="mt-1.5 flex h-1.5 gap-1">
          {(segments.length ? segments : ["bg-[#d8d6d0]"]).map((tone, index) => (
            <span key={index} className={`h-1.5 min-w-0 flex-1 rounded-[2px] ${tone}`} />
          ))}
        </div>
        <div className="mt-1.5 flex gap-3.5 text-[9px] text-text-2">
          <span className="inline-flex items-center gap-[5px]"><span className="size-[5px] rounded-full bg-[#4a5a2a]" />High</span>
          <span className="inline-flex items-center gap-[5px]"><span className="size-[5px] rounded-full bg-[#9a8150]" />Medium</span>
          <span className="inline-flex items-center gap-[5px]"><span className="size-[5px] rounded-full bg-[#d8d6d0]" />Low</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[11px] font-medium text-accent">
        <a href={visitorHref}>Explore version</a>
        <span className="font-normal text-text-2">·</span>
        {compare ? <Link href={compare}>Compare</Link> : <span className="text-text-3">Compare</span>}
        <span className="font-normal text-text-2">·</span>
        <a href={`/api/archive/${version.id}`}>Download package</a>
        <span className="font-normal text-text-2">·</span>
        <a href={`/api/qr/${version.slug}`}>QR sheet</a>
      </div>
    </article>
  );
}

function sitesFrom(versions: VersionCardData[], sites?: ArchiveSite[]): ArchiveSite[] {
  if (sites?.length) return sites;
  const seen = new Map<string, ArchiveSite>();
  for (const version of versions) {
    if (!seen.has(version.siteId)) {
      seen.set(version.siteId, { id: version.siteId, slug: version.slug, name: version.siteName, status: "published" });
    }
  }
  return [...seen.values()];
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function publishedLabel(iso: string) {
  const date = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function CompareView({
  compare,
}: {
  compare: NonNullable<Parameters<typeof ArchiveBoard>[0]["compare"]>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] font-normal leading-10">Compare</h1>
        <div className="flex items-center gap-2 text-[13px] text-text-2">
          <span className="rounded-pill bg-surface-2 px-3 py-1">v{compare.left.number} · {compare.left.publishedAt.slice(0, 10)}</span>
          <span>→</span>
          <span className="rounded-pill bg-surface-2 px-3 py-1">v{compare.right.number} · {compare.right.publishedAt.slice(0, 10)}</span>
          <Link href={`/s/${compare.slug}/archive`} className="text-accent">
            Back
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-4 min-[1100px]:grid-cols-2">
        <ScenePane
          label={`Version ${compare.left.number}`}
          elements={compare.left.elements}
          summary={`${compare.left.total} elements · ${compare.left.high} High`}
          imageUrl={compare.left.imageUrl}
        />
        <ScenePane
          label={`Version ${compare.right.number}`}
          elements={compare.right.elements}
          summary={`${compare.right.total} elements · ${compare.right.high} High`}
          imageUrl={compare.right.imageUrl}
        />
      </div>
      <Card className="mt-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Changes {compare.diff.length}</h2>
        <DiffRows rows={compare.diff} />
      </Card>
    </div>
  );
}

function ScenePane({
  label,
  elements,
  summary,
  imageUrl,
}: {
  label: string;
  elements: SceneElement[];
  summary: string;
  imageUrl?: string | null;
}) {
  return (
    <div>
      {isImageReconstruction() ? (
        <div className="relative min-h-[280px] overflow-hidden rounded-card bg-surface-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full min-h-[280px] object-cover" />
          ) : (
            <p className="flex min-h-[280px] items-center justify-center text-[14px] text-text-2">No reconstruction image</p>
          )}
          <p className="absolute bottom-2 left-2 rounded-pill bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
            Imagined reconstruction
          </p>
        </div>
      ) : (
        <SceneBuilder elements={elements} selectedId={null} onSelect={() => undefined} mode="orbit" colours thenNow="now" onTransform={() => undefined} readOnly />
      )}
      <p className="mt-2 text-[13px] text-text-2">{label}</p>
      <p className="text-[13px] text-text-3">{summary}</p>
    </div>
  );
}
