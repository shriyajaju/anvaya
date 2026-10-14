"use client";

import { Avatar } from "@/components/ui/avatar";
import { ConfidenceBar } from "@/components/ui/bars";
import { Card } from "@/components/ui/card";
import { ChipStatus, type StatusState } from "@/components/ui/chip";
import { activityLine, type OverviewData } from "@/lib/studio/records";
import { useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Circle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusMap: Record<string, StatusState> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

function CountUp({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, value]);
  return <span className={className}>{reduced ? value : shown}</span>;
}

function publishedLabel(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function OverviewBoard({ slug, data }: { slug: string; data: OverviewData }) {
  const published = publishedLabel(data.publishedAt);
  const meta = [data.siteType, data.location].filter(Boolean).join(", ");
  const version = data.version ? `Version ${data.version}` : "No published version";
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-[40px] font-light leading-[48px] text-text-1">{data.name}</h1>
          <ChipStatus state={statusMap[data.status] ?? "Draft"} />
        </div>
        <p className="text-[15px] leading-6 text-text-2">
          {[meta, version, published ? `Published ${published}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
        <Stat label="Elements" value={data.counts.elements} />
        <Stat label="Sources" value={data.counts.sources} />
        <Stat label="Stories" value={data.counts.stories} />
        <Stat label="Open questions" value={data.counts.questions} warn />
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Workflow</h2>
        <Card className="p-6">
          {data.workflow.map((row, index) => (
            <Link
              key={row.id}
              href={`/s/${slug}/${row.id}`}
              className={`flex h-12 items-center gap-3 ${index < data.workflow.length - 1 ? "border-b border-border" : ""}`}
            >
              {row.complete ? (
                <Check aria-hidden className="size-5 text-text-1" />
              ) : (
                <Circle aria-hidden className="size-5 text-text-3" />
              )}
              <span className="min-w-0 flex-1 text-[15px] leading-6 text-text-1">{row.label}</span>
              <span className={`text-[13px] leading-5 ${row.tone === "warn" ? "text-conf-medium" : "text-text-2"}`}>
                {row.detail}
              </span>
              <ChevronRight aria-hidden className="size-5 text-text-3" />
            </Link>
          ))}
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">
          Confidence across the site
        </h2>
        <Card>
          <ConfidenceBar counts={data.confidence} className="w-full" />
          <p className="mt-3 text-[13px] leading-5 text-text-2">{data.uncertainty}</p>
        </Card>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Recent activity</h2>
        <Card>
          {data.activity.length === 0 ? (
            <p className="text-[15px] leading-6 text-text-2">Nothing has been recorded yet.</p>
          ) : (
            data.activity.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 py-3 ${index < data.activity.length - 1 ? "border-b border-border" : ""}`}
              >
                <Avatar initials={item.initials.slice(0, 2)} size="24" />
                <p className="text-[15px] leading-6 text-text-1">{activityLine(item)}</p>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <Card padding="Tight" className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">{label}</p>
      <CountUp
        value={value}
        className={`mt-2 block text-[40px] font-light leading-[48px] ${warn ? "text-conf-medium" : "text-text-1"}`}
      />
    </Card>
  );
}
