"use client";

import { DiffRows } from "@/components/studio/review-shared";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { ConfidenceBar } from "@/components/ui/bars";
import type { VersionCardData } from "@/server/publish-data";
import type { SceneElement } from "@/server/reconstruct-data";
import type { ReviewDiff } from "@/lib/studio/review";
import { Check } from "lucide-react";
import Link from "next/link";

const SceneBuilder = dynamic(() => import("@/components/three/scene-builder").then((mod) => mod.SceneBuilder), { ssr: false });

const preserved = ["3D models (glTF)", "Photographs", "Condition record", "Reconstruction & confidence", "Evidence & citations", "Stories & audio", "Metadata (JSON-LD)", "Checksums"];

export function ArchiveBoard({
  title,
  versions,
  compare,
}: {
  title: string;
  versions: VersionCardData[];
  compare?: {
    left: { id: string; number: string; publishedAt: string; elements: SceneElement[]; high: number; total: number };
    right: { id: string; number: string; publishedAt: string; elements: SceneElement[]; high: number; total: number };
    diff: ReviewDiff[];
    slug: string;
  } | null;
}) {
  if (compare) return <CompareView compare={compare} />;
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[32px] font-normal leading-10">{title}</h1>
        <p className="mt-1 text-[13px] leading-5 text-text-2">Published versions stay beside the working copy. Nothing here is deleted.</p>
      </header>
      <ol className="flex flex-col gap-3">
        {versions.map((version, index) => (
          <li key={version.id}>
            <VersionCard version={version} previous={versions[index + 1]} />
          </li>
        ))}
        <li className="rounded-card border border-dashed border-border px-5 py-4 text-[13px] text-text-3">Next version · not published yet</li>
      </ol>
      <Card>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">What is preserved</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {preserved.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[14px]">
              <Check aria-hidden className="size-4 text-conf-high" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-5 text-text-3">Versions are never deleted. Future updates create new versions alongside this one.</p>
      </Card>
    </div>
  );
}

function VersionCard({ version, previous }: { version: VersionCardData; previous?: VersionCardData }) {
  const when = version.publishedAt.slice(0, 10);
  const compare =
    previous && version.slug
      ? `/s/${version.slug}/archive?left=${previous.id}&right=${version.id}`
      : null;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-medium leading-[26px]">
            {version.siteName} · {version.number}
          </h2>
          <p className="text-[13px] text-text-2">{when}</p>
        </div>
        <p className="text-[13px] text-text-2">{version.changes} changes since</p>
      </div>
      <p className="mt-2 text-[15px] leading-6">{version.note || "No release note."}</p>
      <p className="mt-2 text-[13px] text-text-2">
        {version.elements} elements · {version.sources} sources · {version.stories} stories · {version.locations} locations
      </p>
      <ConfidenceBar counts={{ high: version.high, medium: version.medium, low: version.low }} className="mt-3 w-full" />
      <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
        <a href={`/${version.slug}?v=${version.number}`} className="text-accent">
          Explore version
        </a>
        {compare ? (
          <Link href={compare} className="text-accent">
            Compare
          </Link>
        ) : null}
        <a href={`/api/archive/${version.id}`} className="text-accent">
          Download package
        </a>
      </div>
    </Card>
  );
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
        <ScenePane label={`Version ${compare.left.number}`} elements={compare.left.elements} summary={`${compare.left.total} elements · ${compare.left.high} High`} />
        <ScenePane label={`Version ${compare.right.number}`} elements={compare.right.elements} summary={`${compare.right.total} elements · ${compare.right.high} High`} />
      </div>
      <Card className="mt-4">
        <h2 className="mb-3 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Changes {compare.diff.length}</h2>
        <DiffRows rows={compare.diff} />
      </Card>
    </div>
  );
}

function ScenePane({ label, elements, summary }: { label: string; elements: SceneElement[]; summary: string }) {
  return (
    <div>
      <SceneBuilder elements={elements} selectedId={null} onSelect={() => undefined} mode="orbit" colours thenNow="now" onTransform={() => undefined} readOnly />
      <p className="mt-2 text-[13px] text-text-2">{label}</p>
      <p className="text-[13px] text-text-3">{summary}</p>
    </div>
  );
}
