"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfidenceBar } from "@/components/ui/bars";
import { Field } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import type { PublishPageData } from "@/server/publish-data";
import { publishRelease } from "@/server/publish";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishBoard({ data, published }: { data: PublishPageData; published?: string }) {
  if (published) return <Published data={data} number={published} />;
  return <Ready data={data} />;
}

function Ready({ data }: { data: PublishPageData }) {
  const router = useRouter();
  const [number, setNumber] = useState(data.nextNumber);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[32px] font-normal leading-10">Ready to publish?</h1>
        <p className="mt-1 text-[13px] leading-5 text-text-2">This becomes what visitors see when they scan the QR code at the site.</p>
      </header>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Your experience will include</h2>
        <Card className="mt-3">
          <ul>
            {[
              `${data.elements} reconstructed elements`,
              `${data.sources} evidence sources`,
              `${data.stories} ${data.stories === 1 ? "story" : "stories"} · ${data.minutes} minutes`,
              `${data.locations} visitor locations`,
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 border-b border-border py-2.5 text-[15px] last:border-0">
                <Check aria-hidden className="size-4 text-conf-high" />
                {line}
              </li>
            ))}
          </ul>
          <ConfidenceBar counts={{ high: data.high, medium: data.medium, low: data.low }} className="mt-3 w-full" />
          <p className="mt-2 text-[13px] leading-5 text-text-2">
            {data.high} High · {data.medium} Medium · {data.low} Low
          </p>
          <p className="text-[13px] leading-5 text-text-3">Visitors will see confidence as Well supported · Likely · Uncertain.</p>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Checks</h2>
        <Card className="mt-3">
          <p className="flex items-center gap-2 border-b border-border py-2.5 text-[15px]">
            <Check aria-hidden className={`size-4 ${data.canPublish ? "text-conf-high" : "text-conf-medium"}`} />
            {data.blockReason ?? "Ready to publish"}
          </p>
          <p className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
            <span className="inline-flex items-center gap-2">
              {data.missingEvidence ? <span className="text-conf-medium">!</span> : <Check aria-hidden className="size-4 text-conf-high" />}
              {data.missingEvidence
                ? `${data.missingEvidence} element${data.missingEvidence === 1 ? "" : "s"} without evidence — publish anyway or fix`
                : "Every element has evidence"}
            </span>
            {data.missingEvidence ? (
              <Link href={`/s/${data.slug}/evidence`} className="text-[13px] text-accent">
                Open evidence
              </Link>
            ) : null}
          </p>
        </Card>
      </section>
      <section>
        <h2 className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2">Version</h2>
        <Card className="mt-3">
          <Field label="Version name" value={number} onChange={(event) => setNumber(event.target.value)} />
          <div className="mt-3">
            <Field kind="Textarea" label="Release note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed in this version?" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-[15px]">Keep every previous version in the Archive</span>
            <Toggle label="Keep every previous version" state disabled />
          </div>
          <p className="mt-2 text-[13px] leading-5 text-text-3">A time-stamped package is stored in the Archive. Versions are never deleted.</p>
        </Card>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <a href={`/${data.slug}?preview=${encodeURIComponent(data.previewToken)}`} className="inline-flex h-12 items-center rounded-button bg-surface px-5 text-[11px] font-medium uppercase tracking-[0.08em] shadow-card">
          Preview
        </a>
        <Button
          label="Publish →"
          disabled={!data.canPublish || pending}
          onClick={() => {
            setPending(true);
            void publishRelease({ siteId: data.siteId, number, note }).then((result) => {
              setPending(false);
              if (!result.ok) setError(result.error);
              else router.push(`/s/${data.slug}/publish?published=${result.number}`);
            });
          }}
        />
        {!data.canPublish && data.blockReason ? <p className="text-[13px] text-text-3">{data.blockReason}</p> : null}
        {error ? <p className="text-[13px] text-conf-low">{error}</p> : null}
      </div>
    </div>
  );
}

function Published({ data, number }: { data: PublishPageData; number: string }) {
  const [copied, setCopied] = useState(false);
  const url = `anvaya.site/${data.slug}`;
  const qr = `${process.env.SUPABASE_URL}/storage/v1/object/public/published/qr/${data.slug}/site.png`;
  return (
    <div className="grid items-center gap-10 py-8 min-[1100px]:grid-cols-2">
      <div className="relative mx-auto h-[560px] w-full max-w-[520px]">
        <span aria-hidden className="absolute left-0 top-4 size-52 rounded-full bg-[#6d5ef6]/70 blur-2xl" />
        <span aria-hidden className="absolute right-6 top-10 size-36 rounded-full bg-[#e056b0]/70 blur-2xl" />
        <span aria-hidden className="absolute bottom-8 right-10 size-40 rounded-full bg-[#3b6cff]/70 blur-2xl" />
        <div className="absolute left-1/2 top-6 w-[240px] -translate-x-1/2 rounded-[20px] bg-[#1c1c1c] p-4 text-[#f5f5f5] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/60">ANVAYA</p>
          <p className="mt-2 font-serif text-[22px] leading-7">{data.name}</p>
          <p className="mt-1 text-[13px] text-white/80">See what remains. Discover what once was.</p>
          <p className="mt-4 text-[12px] text-white/60">Version {number}</p>
        </div>
      </div>
      <div className="max-w-[560px]">
        <h1 className="text-[32px] font-normal leading-10">{data.name} is now live</h1>
        <p className="mt-3 text-[15px] leading-6 text-text-2">
          Visitors can scan the code at the site to begin exploring. A time-stamped copy of version {number} has been saved to the Archive.
        </p>
        <div className="mt-6 flex items-center justify-between rounded-card bg-surface px-5 py-3.5 shadow-card">
          <span className="text-[15px]">{url}</span>
          <button
            type="button"
            aria-label="Copy visitor address"
            onClick={() => {
              void navigator.clipboard.writeText(`https://${url}`);
              setCopied(true);
            }}
          >
            <Copy className="size-4" />
          </button>
        </div>
        {copied ? <p className="mt-1 text-[13px] text-text-3">Copied.</p> : null}
        <div className="mt-6 flex items-center gap-6">
          <img src={qr} alt={`QR code for ${data.name}`} className="size-40 rounded-card bg-surface p-3 shadow-card" />
          <div>
            <p className="text-[13px] leading-5 text-text-2">Print-ready · scan with any phone camera</p>
            <a href={`/api/qr/${data.slug}`} className="mt-3 inline-flex h-9 items-center rounded-button bg-surface px-3.5 text-[11px] font-medium uppercase tracking-[0.08em] shadow-card">
              Download QR sheet
            </a>
            <p className="mt-3 text-[13px] leading-5 text-text-3">Per-location codes open at that spot</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/s/${data.slug}/overview`} className="inline-flex h-12 items-center rounded-button bg-surface px-5 text-[11px] font-medium uppercase tracking-[0.08em] shadow-card">
            Continue editing
          </Link>
          <a href={`/${data.slug}`} className="inline-flex h-12 items-center rounded-button bg-primary px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary">
            Open visitor experience
          </a>
        </div>
        <Link href={`/s/${data.slug}/archive`} className="mt-4 inline-block text-[13px] text-accent">
          View in Archive
        </Link>
      </div>
    </div>
  );
}
