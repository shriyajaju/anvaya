"use client";

import { ChipConfidence } from "@/components/ui/chip";
import { PhoneFrame } from "@/components/studio/phone-frame";
import { VisitorPreview } from "@/components/visitor/visitor-preview";
import { createQuestion } from "@/server/evidence";
import type { AnalyticsPageData } from "@/server/analytics-data";
import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AnalyticsBoard({ data, slug, range }: { data: AnalyticsPageData; slug: string; range: string }) {
  const [tab, setTab] = useState<"visitors" | "feedback">("visitors");
  const site = data.sites.find((item) => item.id === data.siteId);
  const maxScans = Math.max(1, ...data.locations.map((item) => item.scans));
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-8 py-8">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-[32px] font-light leading-10">Analytics</h1>
        <div className="flex items-center gap-2">
          <form>
            <label className="sr-only" htmlFor="analytics-site">Site</label>
            <select id="analytics-site" name="site" defaultValue={slug} className="h-9 rounded-pill border border-border bg-surface px-3 text-[13px]" onChange={(event) => { window.location.search = `?site=${event.target.value}&range=${range}`; }}>
              {data.sites.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </form>
          <div className="flex rounded-pill bg-surface-2 p-1 text-[11px] font-medium uppercase tracking-[0.08em]">
            {["all", "1d", "7d", "30d"].map((item) => (
              <Link key={item} href={`?site=${slug}&range=${item}`} className={`rounded-pill px-3 py-1 ${range === item ? "bg-primary text-on-primary" : "text-text-2"}`}>{item}</Link>
            ))}
          </div>
        </div>
      </header>
      <div className="flex gap-6 text-[15px]">
        <button type="button" className={tab === "visitors" ? "border-b border-text-1 pb-1" : "text-text-2"} onClick={() => setTab("visitors")}>Visitors</button>
        <button type="button" className={tab === "feedback" ? "border-b border-text-1 pb-1" : "text-text-2"} onClick={() => setTab("feedback")}>Feedback</button>
      </div>
      {tab === "visitors" ? (
        <>
          <div className="relative mx-auto grid h-[460px] w-full max-w-[920px] grid-cols-[1fr_220px_1fr] items-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-2" />
            <div className="z-10 flex flex-col gap-16">
              <Stat label="Scans" value={data.scans} note={`${data.sessions} sessions`} />
              <Stat label="How do we know? opened" value={data.hdwkOpens} note={`${data.hdwkShare}% of sessions`} />
            </div>
            <div className="z-10 mx-auto h-[420px] w-[200px] overflow-hidden">
              <PhoneFrame revision={data.siteId} theme="dark">
                <VisitorPreview name={site?.name ?? "Site"} location={null} preview={false} framed />
              </PhoneFrame>
            </div>
            <div className="z-10 flex flex-col items-end gap-16">
              <Stat label="AR sessions" value={data.arOpens} note="Opens of the AR view" />
              <Stat label="Stories played" value={data.storiesPlayed} note="Story steps opened" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-card bg-surface p-5">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Most viewed elements</h2>
              <ul className="mt-3">
                {data.elements.length === 0 ? <li className="py-3 text-[13px] text-text-2">No element views in this range.</li> : null}
                {data.elements.map((element) => (
                  <li key={element.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                    <span>{element.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{element.views}</span>
                      <ChipConfidence level={element.confidence === "high" ? "High" : element.confidence === "medium" ? "Medium" : "Low"} audience="Studio" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-card bg-surface p-5">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Scans by location</h2>
              <div className="mt-4 flex h-40 items-end gap-3">
                {data.locations.map((location) => (
                  <div key={location.id} className="flex flex-1 flex-col items-center gap-2">
                    <Bar height={(location.scans / maxScans) * 100} />
                    <span className="text-center text-[11px] text-text-2">{location.name.replace(/^L\d+\s+/, "")}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <FeedbackTab data={data} />
      )}
      <p className="text-[13px] text-text-3">Metrics describe engagement and understanding only.</p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex size-40 flex-col items-center justify-center rounded-full bg-surface text-center shadow-card">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{label}</p>
      <CountUp value={value} className="text-[40px] font-light leading-none" />
      <p className="mt-1 text-[13px] text-text-2">{note}</p>
    </div>
  );
}

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

function Bar({ height }: { height: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="w-full max-w-8 rounded-t-button bg-primary"
      initial={reduced ? false : { height: 0 }}
      animate={{ height: `${Math.max(height, 4)}%` }}
      transition={{ duration: reduced ? 0 : 0.6 }}
    />
  );
}

function FeedbackTab({ data }: { data: AnalyticsPageData }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-4">
        <CircleStat label="Responses" value={String(data.feedback.responses)} />
        <CircleStat label="Helped me understand" value={data.feedback.understand == null ? "—" : `${data.feedback.understand} / 5`} />
        <CircleStat label="I trust this reconstruction" value={data.feedback.trust == null ? "—" : `${data.feedback.trust} / 5`} />
      </div>
      <section className="rounded-card bg-surface p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">Visitor comments</h2>
        <ul className="mt-2">
          {data.feedback.comments.length === 0 ? <li className="py-3 text-[13px] text-text-2">No comments in this range.</li> : null}
          {data.feedback.comments.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-3">{new Date(comment.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="text-[15px] leading-6">“{comment.comment}”</p>
              </div>
              <AddQuestion siteId={data.siteId} text={comment.comment} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CircleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex size-40 flex-col items-center justify-center rounded-full bg-surface text-center shadow-card">
      <p className="px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{label}</p>
      <p className="text-[28px] font-light">{value}</p>
    </div>
  );
}

function AddQuestion({ siteId, text }: { siteId: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={done || text.trim().length < 4}
      className="shrink-0 text-[13px] text-text-2 underline disabled:no-underline disabled:opacity-50"
      onClick={() => {
        void createQuestion({ siteId, elementId: null, question: text.slice(0, 240), context: "Raised from visitor feedback.", level: "low" }).then((result) => {
          if (result.ok) setDone(true);
        });
      }}
    >
      {done ? "Added" : "Add to open questions"}
    </button>
  );
}
