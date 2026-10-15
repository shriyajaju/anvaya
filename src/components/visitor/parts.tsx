import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import type { VisitorLevel } from "@/lib/visitor/types";
import { visitorLabel } from "@/lib/visitor/types";

export function GlassPill({ children, href }: { children: React.ReactNode; href?: string }) {
  const className =
    "inline-flex h-10 items-center justify-center rounded-pill border border-white/40 bg-white/15 px-3.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-[var(--color-glass-text)] backdrop-blur-[8px]";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}

export function VButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const className =
    "flex h-[52px] w-full items-center justify-center rounded-card bg-white text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-black";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function TopNav({ back, title, info }: { back: string; title: string; info?: string }) {
  return (
    <header className="absolute left-4 right-4 top-[54px] z-30 flex h-10 items-center justify-between">
      <Link href={back} aria-label="Back" className="flex size-10 items-center justify-center rounded-pill border border-white/20 bg-white/10 backdrop-blur-[8px]">
        <ChevronLeft size={20} />
      </Link>
      <GlassPill>{title}</GlassPill>
      {info ? (
        <Link href={info} aria-label="How do we know?" className="flex size-10 items-center justify-center rounded-pill border border-white/20 bg-white/10 backdrop-blur-[8px]">
          <Info size={18} />
        </Link>
      ) : (
        <span className="size-10" />
      )}
    </header>
  );
}

export function ConfidenceChip({ level, href }: { level: VisitorLevel; href: string }) {
  const color = level === "high" ? "var(--color-conf-glass-high)" : level === "medium" ? "var(--color-conf-glass-medium)" : "var(--color-conf-glass-low)";
  return (
    <Link href={href} className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-black/55 px-2.5 text-[11px] font-medium uppercase tracking-[0.08em] backdrop-blur-[8px]" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {visitorLabel(level)}
      <span className="flex size-5 items-center justify-center rounded-full border text-[11px]" style={{ borderColor: color }} aria-hidden>
        ?
      </span>
    </Link>
  );
}

export function ActionGrid({ slug, elementId }: { slug: string; elementId: string }) {
  const tiles = [
    ["Stories", `/${slug}/stories`],
    ["How do we know?", `/${slug}/hdwk/${elementId}`],
    ["Timeline", `/${slug}/timeline`],
    ["Then / Now", `/${slug}/compare/${elementId}`],
  ];
  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {tiles.map(([label, href]) => (
        <Link key={label} href={href} className="flex h-16 flex-col items-center justify-center rounded-card bg-surface-2 px-1 text-center text-[9px] font-medium uppercase leading-3 tracking-[0.08em] text-text-1">
          {label}
        </Link>
      ))}
    </div>
  );
}

export function FactRow({ kind, text }: { kind: "know" | "assume"; text: string }) {
  return (
    <p className="border-l-2 border-white/30 pl-3 text-[15px] leading-6 text-text-1">
      <span className="mr-2 text-[11px] uppercase tracking-[0.08em] text-text-3">{kind === "know" ? "Know" : "Assume"}</span>
      {text}
    </p>
  );
}

export function SourceRow({ title, citation }: { title: string; citation: string | null }) {
  return (
    <div className="rounded-card bg-surface-2 px-3 py-2">
      <p className="text-[15px] leading-6 text-text-1">{title}</p>
      {citation ? <p className="text-[13px] leading-5 text-text-2">{citation}</p> : null}
    </div>
  );
}

export function AltReading({ label, summary }: { label: string; summary: string }) {
  return (
    <div className="rounded-card border border-border px-3 py-2">
      <p className="text-[13px] leading-5 text-text-2">{label}</p>
      <p className="text-[15px] leading-6">{summary}</p>
    </div>
  );
}

export function FooterNote({ reviewer, version }: { reviewer: string | null; version: string | null }) {
  return (
    <p className="text-[13px] leading-5 text-text-3">
      Reviewed by {reviewer ?? "the site team"} · Version {version ?? "working copy"}
    </p>
  );
}

export function OfflineBanner() {
  return (
    <p className="offline-banner hidden bg-conf-low px-4 py-2 text-center text-[13px] text-white">
      You are offline. The last opened site is still available.
    </p>
  );
}
