"use client";

import { createQuestion } from "@/server/evidence";
import type { AnalyticsPageData } from "@/server/analytics-data";
import { useReducedMotion } from "framer-motion";
import { ChevronDown, CircleHelp, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TABS = ["Visitors", "AR engagement", "Stories", "Evidence engagement", "Feedback"] as const;
type Tab = (typeof TABS)[number];

const RANGES = [
  { id: "all", label: "ALL" },
  { id: "1d", label: "1D" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
] as const;

export function AnalyticsBoard({ data, slug, range }: { data: AnalyticsPageData; slug: string; range: string }) {
  const [tab, setTab] = useState<Tab>("Visitors");
  const site = data.sites.find((item) => item.id === data.siteId);
  const maxScans = Math.max(1, ...data.locations.map((item) => item.scans));
  const focus = data.elements[0];

  return (
    <div className="mx-auto flex w-full max-w-[1272px] flex-col gap-[22px] px-6 py-9">
      <header className="flex flex-col gap-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[40px] font-light leading-[1.12] tracking-[-0.8px] text-text-1">Analytics</h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Site</span>
              <select
                aria-label="Site"
                defaultValue={slug}
                className="h-9 appearance-none rounded-pill border border-border bg-surface py-0 pl-[15px] pr-8 text-[11px] font-medium text-text-1"
                onChange={(event) => {
                  window.location.search = `?site=${event.target.value}&range=${range}`;
                }}
              >
                {data.sites.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-text-1" />
            </label>
            <div className="flex h-9 items-center gap-0.5 rounded-pill bg-surface-2 p-1">
              {RANGES.map((item) => (
                <Link
                  key={item.id}
                  href={`?site=${slug}&range=${item.id}`}
                  className={`inline-flex h-7 items-center rounded-pill px-[11px] text-[10px] font-semibold tracking-[0.6px] ${
                    range === item.id ? "bg-primary text-on-primary" : "text-text-2"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex h-[34px] flex-wrap gap-7" role="tablist" aria-label="Analytics">
          {TABS.map((item) => {
            const selected = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item)}
                className={`flex h-[34px] flex-col justify-between text-[13px] ${selected ? "font-semibold text-text-1" : "font-normal text-text-2"}`}
              >
                <span>{item}</span>
                <span className={`h-0.5 w-full rounded-pill ${selected ? "bg-primary" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </header>

      {tab === "Visitors" ? (
        <Visitors data={data} siteName={site?.name ?? "Site"} focus={focus} maxScans={maxScans} />
      ) : null}
      {tab === "Feedback" ? <FeedbackTab data={data} /> : null}
      {tab === "AR engagement" ? <SingleStat label="AR sessions" value={data.arOpens} note="Opens of the AR view" /> : null}
      {tab === "Stories" ? <SingleStat label="Stories played" value={data.storiesPlayed} note="Story steps opened" /> : null}
      {tab === "Evidence engagement" ? (
        <SingleStat label="How do we know? opened" value={data.hdwkOpens} note={`${data.hdwkShare}% of sessions`} accent />
      ) : null}
    </div>
  );
}

function Visitors({
  data,
  siteName,
  focus,
  maxScans,
}: {
  data: AnalyticsPageData;
  siteName: string;
  focus: AnalyticsPageData["elements"][number] | undefined;
  maxScans: number;
}) {
  return (
    <>
      <div className="relative mx-auto hidden h-[594px] w-full max-w-[904px] lg:block">
        <div aria-hidden className="absolute left-[202px] top-[38px] size-[500px] rounded-full bg-surface-2" />
        <div aria-hidden className="absolute left-1 top-[42px] size-[92px] rounded-full bg-[#f3d7c4]" />
        <ArPhone className="absolute left-[345px] top-12" siteName={siteName} focus={focus} />
        <Stat className="absolute left-[30px] top-[52px]" label="Scans" value={data.scans} note={`${data.sessions} sessions`} />
        <Stat className="absolute left-[674px] top-[88px]" label="AR sessions" value={data.arOpens} note="Opens of the AR view" />
        <Stat
          className="absolute left-3 top-[344px]"
          label="‘How do we know?’ opened"
          value={data.hdwkOpens}
          note={`${data.hdwkShare}% of sessions`}
          accent
        />
        <Stat className="absolute left-[692px] top-[354px]" label="Stories played" value={data.storiesPlayed} />
      </div>
      <div className="grid grid-cols-2 justify-items-center gap-6 lg:hidden">
        <Stat label="Scans" value={data.scans} note={`${data.sessions} sessions`} />
        <Stat label="AR sessions" value={data.arOpens} note="Opens of the AR view" />
        <Stat label="‘How do we know?’ opened" value={data.hdwkOpens} note={`${data.hdwkShare}% of sessions`} accent />
        <Stat label="Stories played" value={data.storiesPlayed} />
        <ArPhone className="col-span-2" siteName={siteName} focus={focus} />
      </div>
      <div className="mx-auto grid w-full max-w-[904px] grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="flex h-[214px] flex-col gap-2 overflow-hidden rounded-card border border-border bg-surface px-5 pb-3.5 pt-5 shadow-card">
          <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Most viewed elements</h2>
          <ul>
            {data.elements.length === 0 ? <li className="py-3 text-[13px] text-text-2">No element views in this range.</li> : null}
            {data.elements.slice(0, 3).map((element) => (
              <li key={element.id} className="flex h-[42px] items-center justify-between border-b border-border last:border-0">
                <span className="w-[220px] truncate text-[13px] font-medium text-text-1">{element.name}</span>
                <span className="flex items-center gap-3">
                  <span className="w-[26px] text-right text-[13px] font-semibold tabular-nums">{element.views}</span>
                  <ConfidencePill level={element.confidence} />
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex h-[214px] flex-col gap-3 overflow-hidden rounded-card border border-border bg-surface px-5 pb-3 pt-5 shadow-card">
          <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Scans by location</h2>
          <div className="flex h-[126px] items-end justify-between">
            {data.locations.map((location) => (
              <div key={location.id} className="flex h-[126px] w-16 flex-col items-center justify-end gap-2">
                <div className="flex h-[92px] items-end">
                  <div
                    className="w-7 rounded-b-[2px] rounded-t-[5px] bg-primary"
                    style={{ height: location.scans === 0 ? 0 : Math.max(12, Math.round((location.scans / maxScans) * 92)) }}
                  />
                </div>
                <span className="w-16 truncate text-center text-[9px] leading-[1.2] text-text-2">
                  {location.name.replace(/^L\d+\s+/, "")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ArPhone({
  className = "",
  siteName,
  focus,
}: {
  className?: string;
  siteName: string;
  focus: AnalyticsPageData["elements"][number] | undefined;
}) {
  return (
    <div className={`flex h-[464px] w-[215px] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_22px_48px_-10px_rgba(17,17,17,0.13)] ${className}`}>
      <div className="flex h-6 items-center justify-between bg-white px-3.5 text-[7px] font-semibold text-[#111]">
        <span>9:41</span>
        <span className="tracking-[0.4px]">LTE</span>
      </div>
      <div className="flex h-[34px] items-center justify-between bg-white px-3">
        <span className="text-[7px] font-semibold tracking-[0.7px] text-[#111]">ANVAYA</span>
        <span className="flex size-[19px] items-center justify-center rounded-full bg-[#f1f1ee] text-[9px] text-[#111]">×</span>
      </div>
      <div className="relative h-[350px] overflow-hidden">
        <img src="/analytics/ar-scene.png" alt="" className="size-full object-cover" />
        <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-pill bg-white/90 px-2 text-[7px] font-semibold tracking-[0.56px] text-[#111]">
          <span className="size-[5px] rounded-full bg-[#42734a]" />
          VISITOR V03 · AR
        </span>
        <span className="absolute left-[139px] top-24 flex size-[54px] items-center justify-center rounded-full border border-white/80 text-white">
          <span className="size-5 rounded-full border border-white" />
        </span>
        <div className="absolute bottom-4 left-2.5 w-[195px] rounded-[10px] bg-white/95 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold text-[#111]">{focus?.name ?? siteName}</p>
            {focus ? <ConfidencePill level={focus.confidence} /> : null}
          </div>
          <p className="mt-1 text-[8px] leading-[1.35] text-[#6b6b6b]">Recorded views for this reconstruction.</p>
        </div>
      </div>
      <div className="flex h-10 items-center justify-between bg-white px-3">
        <span className="text-[8px] font-medium text-[#6b6b6b]">Move to inspect</span>
        <span className="inline-flex h-6 items-center rounded-button bg-[#111] px-2.5 text-[7px] font-semibold tracking-[0.56px] text-white">
          VIEW EVIDENCE
        </span>
      </div>
      <div className="flex h-4 items-center justify-center bg-white">
        <span className="h-[3px] w-[54px] rounded-pill bg-[#111]/40" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  accent = false,
  className = "",
}: {
  label: string;
  value: number;
  note?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex size-[200px] flex-col justify-center gap-2 rounded-full bg-surface p-[30px] shadow-[0_16px_36px_-4px_rgba(17,17,17,0.07)] ${className}`}>
      <p className="w-[140px] text-[10px] font-semibold uppercase leading-[1.25] tracking-[1px] text-text-3">{label}</p>
      <CountUp
        value={value}
        className={`w-[140px] text-[52px] font-light leading-[0.98] tracking-[-1.56px] ${accent ? "text-accent" : "text-text-1"}`}
      />
      {note ? <p className={`w-[140px] text-[11px] font-medium leading-[1.3] ${accent ? "text-[#42734a]" : "text-text-2"}`}>{note}</p> : <span className="h-[14px]" />}
    </div>
  );
}

function SingleStat({ label, value, note, accent = false }: { label: string; value: number; note: string; accent?: boolean }) {
  return (
    <div className="flex justify-center py-10">
      <Stat label={label} value={value} note={note} accent={accent} />
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

function ConfidencePill({ level }: { level: "high" | "medium" | "low" }) {
  const tone =
    level === "high"
      ? "bg-[#e8f1e7] text-[#42734a]"
      : level === "medium"
        ? "bg-[#f5ecd9] text-[#9b6a20]"
        : "bg-[#f4e6e0] text-[#9a5f4a]";
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  return <span className={`inline-flex rounded-pill px-2 py-[3px] text-[9px] font-medium ${tone}`}>{label}</span>;
}

const UNDERSTANDING = ["Original appearance", "Scale and layout", "How it was used", "What is uncertain"];

function FeedbackTab({ data }: { data: AnalyticsPageData }) {
  const understand = data.feedback.understand;
  const trust = data.feedback.trust;
  const after = understand == null ? 0 : Math.round((understand / 5) * 100);
  return (
    <div className="mx-auto grid w-full max-w-[1064px] grid-cols-1 gap-6 xl:grid-cols-[560px_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <FeedbackCircle label="Responses" value={String(data.feedback.responses)} />
          <FeedbackCircle label="‘Helped me understand’" value={understand == null ? "—" : `${understand} / 5`} accent />
          <FeedbackCircle label="‘I trust this reconstruction’" value={trust == null ? "—" : `${trust} / 5`} accent />
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Visitor comments</h2>
          <ul className="overflow-hidden rounded-card border border-border bg-surface px-5 shadow-card">
            {data.feedback.comments.length === 0 ? <li className="py-4 text-[13px] text-text-2">No comments in this range.</li> : null}
            {data.feedback.comments.map((comment) => (
              <li key={comment.id} className="flex h-[82px] items-center gap-3.5 border-b border-border py-3 last:border-0">
                <span className="w-16 shrink-0 text-[10px] uppercase leading-[1.3] text-text-3">
                  {new Date(comment.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-[1.35] text-text-1">“{comment.comment}”</p>
                  {comment.page ? (
                    <span className="mt-1.5 inline-flex rounded-pill bg-surface-2 px-2 py-1 text-[9px] font-medium text-text-2">{comment.page}</span>
                  ) : null}
                </div>
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-2">
                  {(understand ?? 0) >= 4 ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Understanding before / after</h2>
            <span className="flex items-center gap-3 text-[9px] text-text-3">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-pill bg-[#f1f1ee]" /> Before</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 rounded-pill bg-accent" /> After</span>
            </span>
          </div>
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
            {UNDERSTANDING.map((label, index) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-[12px] font-medium text-text-1">{label}</p>
                <div className="h-[7px] overflow-hidden rounded-pill bg-page">
                  <div className="h-full rounded-pill bg-[#f1f1ee]" style={{ width: `${Math.max(8, Math.round(after * (0.55 - index * 0.08)))}%` }} />
                </div>
                <div className="h-[7px] overflow-hidden rounded-pill bg-page">
                  <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.max(after === 0 ? 0 : 12, after - index * 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <OpenQuestions data={data} />
      </div>
    </div>
  );
}

function FeedbackCircle({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex size-[176px] flex-col justify-center gap-2.5 rounded-full bg-surface px-[22px] pb-6 pt-[30px] shadow-[0_16px_36px_-4px_rgba(17,17,17,0.07)]">
      <p className="h-8 text-[9px] font-semibold uppercase leading-[1.25] tracking-[0.9px] text-text-3">{label}</p>
      <p className={`text-[35px] font-light leading-none tracking-[-1.05px] ${accent ? "text-accent" : "text-text-1"}`}>{value}</p>
    </div>
  );
}

function OpenQuestions({ data }: { data: AnalyticsPageData }) {
  const [added, setAdded] = useState<string[]>([]);
  const pending = data.feedback.comments.filter((comment) => !added.includes(comment.id));
  const next = pending[0];
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[1.2px] text-text-3">Open questions raised by visitors</h2>
      <div className="rounded-card border border-border bg-surface px-5 pb-[18px] pt-1.5 shadow-card">
        {added.length === 0 && !next ? <p className="py-4 text-[13px] text-text-2">No visitor comments to raise.</p> : null}
        {data.feedback.comments
          .filter((comment) => added.includes(comment.id))
          .map((comment) => (
            <div key={comment.id} className="flex h-[58px] items-center gap-3 border-b border-border text-[12px] font-medium text-text-1">
              <CircleHelp className="size-4 shrink-0 text-text-2" />
              <span className="min-w-0 flex-1">{comment.comment}</span>
            </div>
          ))}
        {next ? (
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center rounded-button bg-primary px-3 text-[9px] font-semibold tracking-[0.72px] text-on-primary"
            onClick={() => {
              void createQuestion({
                siteId: data.siteId,
                elementId: null,
                question: next.comment.slice(0, 240),
                context: "Raised from visitor feedback.",
                level: "low",
              }).then((result) => {
                if (result.ok) setAdded((current) => [...current, next.id]);
              });
            }}
          >
            ADD TO OPEN QUESTIONS
          </button>
        ) : null}
      </div>
    </div>
  );
}
