"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { focusRing } from "@/components/ui/motion";
import { LayoutGrid, List, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type SitesBoardSite = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  version: string | null;
  steps: Record<string, boolean>;
  counts: { high: number; medium: number; low: number };
};

type Status = SitesBoardSite["status"];

type CatalogCard = {
  id: string;
  name: string;
  location: string;
  edited: string;
  status: Status;
  version: string;
  image: string;
  people: { initials: string; color: string }[];
  dots: number;
  confidence: number;
};

const PEOPLE = {
  AN: { initials: "AN", color: "#c8c1b5" },
  RK: { initials: "RK", color: "#b8c2af" },
  MS: { initials: "MS", color: "#c3bacf" },
  PJ: { initials: "PJ", color: "#d3b9a7" },
  DM: { initials: "DM", color: "#aebfc8" },
} as const;

const CATALOG: CatalogCard[] = [
  {
    id: "ajanta-cave-1",
    name: "Ajanta Cave 1",
    location: "Ajanta, Maharashtra",
    edited: "Edited 2 h ago",
    status: "published",
    version: "v1.0",
    image: "/seed-reconstructions/ajanta-cave-1/source-photo.jpg",
    people: [PEOPLE.AN, PEOPLE.RK, PEOPLE.MS],
    dots: 8,
    confidence: 3,
  },
  {
    id: "vasai",
    name: "Vasai Fort",
    location: "Mumbai, Maharashtra",
    edited: "Edited 2 h ago",
    status: "draft",
    version: "v1.0",
    image: "/site-covers/vasai.png",
    people: [PEOPLE.RK, PEOPLE.PJ, PEOPLE.AN],
    dots: 4,
    confidence: 2,
  },
  {
    id: "elephanta",
    name: "Elephanta Caves",
    location: "Mumbai, Maharashtra",
    edited: "Edited 2 h ago",
    status: "in_review",
    version: "v1.0",
    image: "/site-covers/elephanta.png",
    people: [PEOPLE.MS, PEOPLE.AN, PEOPLE.DM],
    dots: 6,
    confidence: 2,
  },
  {
    id: "kondana",
    name: "Kondana Caves",
    location: "Mumbai, Maharashtra",
    edited: "Edited 2 h ago",
    status: "draft",
    version: "v1.0",
    image: "/site-covers/kondana.png",
    people: [PEOPLE.PJ, PEOPLE.DM, PEOPLE.RK],
    dots: 1,
    confidence: 1,
  },
  {
    id: "mahakali",
    name: "Mahakali Caves",
    location: "Mumbai, Maharashtra",
    edited: "Edited 2 h ago",
    status: "published",
    version: "v1.0",
    image: "/site-covers/mahakali.png",
    people: [PEOPLE.AN, PEOPLE.MS, PEOPLE.PJ],
    dots: 7,
    confidence: 3,
  },
  {
    id: "sopara",
    name: "Sopara Stupa",
    location: "Mumbai, Maharashtra",
    edited: "Edited 2 h ago",
    status: "archived",
    version: "v1.0",
    image: "/site-covers/sopara.png",
    people: [PEOPLE.DM, PEOPLE.RK, PEOPLE.MS],
    dots: 5,
    confidence: 2,
  },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In Review" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
] as const;

const STATUS_PILL: Record<Status, { label: string; className: string; dot: string }> = {
  published: { label: "Published", className: "bg-[#e7ebdd] text-[#4a5a2a]", dot: "bg-[#4a5a2a]" },
  draft: { label: "Draft", className: "bg-[#f1f1ee] text-[#6b6b6b]", dot: "bg-[#6b6b6b]" },
  in_review: { label: "In Review", className: "bg-[#e8edf7] text-[#4e78c4]", dot: "bg-[#4e78c4]" },
  archived: { label: "Archived", className: "bg-[#eceae5] text-[#77746d]", dot: "bg-[#77746d]" },
};

export function SitesBoard({ sites }: { sites: SitesBoardSite[]; members: { initials: string }[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const live = useMemo(() => new Map(sites.map((site) => [site.name.toLowerCase(), site])), [sites]);

  const cards = useMemo(() => {
    const catalog = CATALOG.map((card) => ({
      ...card,
      href: live.get(card.name.toLowerCase()) ? `/s/${live.get(card.name.toLowerCase())!.slug}/overview` : null,
    }));
    const extra = sites
      .filter((site) => !CATALOG.some((card) => card.name.toLowerCase() === site.name.toLowerCase()))
      .map((site) => ({
        id: site.id,
        name: site.name,
        location: site.location ?? "Mumbai, Maharashtra",
        edited: "Edited recently",
        status: site.status,
        version: site.version ? (site.version.startsWith("v") ? site.version : `v${site.version}`) : "v1.0",
        image: "/seed-reconstructions/ajanta-cave-1/source-photo.jpg",
        people: [PEOPLE.AN, PEOPLE.RK, PEOPLE.MS],
        dots: 4,
        confidence: 2,
        href: `/s/${site.slug}/overview` as string | null,
      }));
    return [...catalog, ...extra];
  }, [live, sites]);

  const counts = useMemo(
    () => ({
      all: cards.length,
      draft: cards.filter((card) => card.status === "draft").length,
      in_review: cards.filter((card) => card.status === "in_review").length,
      published: cards.filter((card) => card.status === "published").length,
      archived: cards.filter((card) => card.status === "archived").length,
    }),
    [cards],
  );

  const visible = cards.filter((card) => {
    const haystack = `${card.name} ${card.location}`.toLowerCase();
    if (query && !haystack.includes(query.trim().toLowerCase())) return false;
    return filter === "all" || card.status === filter;
  });

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-6 py-8 min-[1100px]:px-8 min-[1100px]:py-12">
      <div className="flex h-12 flex-wrap items-center justify-between gap-4">
        <h1 className="text-[40px] font-light leading-[1.12] tracking-[-0.8px] text-text-1">My sites</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-10 w-[280px] max-w-full items-center gap-2.5 rounded-button border border-border bg-surface px-3.5">
            <Search aria-hidden className="size-4 shrink-0 text-text-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sites"
              aria-label="Search sites"
              className="w-full bg-transparent text-[13px] text-text-1 outline-none placeholder:text-text-3"
            />
          </label>
          <button
            type="button"
            className={`${focusRing} inline-flex h-10 w-[88px] items-center justify-center rounded-button border border-border bg-surface text-[11px] font-semibold tracking-[1.1px] text-text-1 shadow-card`}
          >
            IMPORT
          </button>
          <Link
            href="/sites/new"
            className={`${focusRing} inline-flex h-10 w-[112px] items-center justify-center rounded-button border border-primary bg-primary text-[11px] font-semibold tracking-[1.1px] text-on-primary`}
          >
            + NEW SITE
          </Link>
        </div>
      </div>

      <div className="flex h-10 flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex h-10 items-center gap-7" role="tablist" aria-label="Site status">
          {FILTERS.map((item) => {
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(item.id)}
                className={`${focusRing} flex h-10 flex-col items-center justify-between text-[13px] ${
                  selected ? "font-semibold text-text-1" : "font-normal text-text-2"
                }`}
              >
                <span>
                  {item.label} {counts[item.id]}
                </span>
                <span className={`h-0.5 w-full rounded-pill ${selected ? "bg-primary" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-[34px] w-[72px] gap-0.5 rounded-button border border-border bg-surface p-[3px]">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`flex h-7 w-8 items-center justify-center rounded-[6px] ${view === "grid" ? "bg-primary text-on-primary" : "text-text-2"}`}
            >
              <LayoutGrid aria-hidden className="size-[15px]" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex h-7 w-8 items-center justify-center rounded-[6px] ${view === "list" ? "bg-primary text-on-primary" : "text-text-2"}`}
            >
              <List aria-hidden className="size-4" />
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-[34px] items-center rounded-pill border border-border bg-surface px-3 text-[12px] font-medium text-text-2"
          >
            Recently edited ▾
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No sites yet"
          body="Create a site to document a place, link evidence, and publish a visitor reconstruction."
          action={
            <Link
              href="/sites/new"
              className="inline-flex h-12 items-center rounded-button bg-primary px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary"
            >
              Create a site
            </Link>
          }
        />
      ) : view === "grid" ? (
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,380px),380px))] justify-start gap-6">
          {visible.map((card) => (
            <SiteCard key={card.id} card={card} />
          ))}
          <Link
            href="/sites/new"
            className={`${focusRing} flex h-[300px] w-full max-w-[380px] items-center justify-center rounded-card border border-dashed border-border bg-surface/20 text-[15px] font-medium text-accent`}
          >
            + Create a new site
          </Link>
        </div>
      ) : (
        <div className="flex w-full max-w-[1188px] flex-col gap-3">
          {visible.map((card) => (
            <SiteCard key={card.id} card={card} list />
          ))}
        </div>
      )}
    </div>
  );
}

function SiteCard({
  card,
  list = false,
}: {
  card: CatalogCard & { href: string | null };
  list?: boolean;
}) {
  const status = STATUS_PILL[card.status];
  const body = (
    <>
      <div className={`relative shrink-0 overflow-hidden ${list ? "min-h-[148px] w-[220px] self-stretch" : "h-[160px] w-full"}`}>
        <img src={card.image} alt="" className="size-full object-cover" />
        {card.status === "archived" ? <span className="absolute inset-0 bg-[rgba(229,226,218,0.2)]" /> : null}
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-[11px] font-medium ${status.className}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className="absolute right-3 top-3 rounded-pill bg-white/90 px-2 py-[5px] text-[10px] font-medium text-[#111]">
          {card.version}
        </span>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col justify-between p-5 ${list ? "" : "h-[140px]"}`}>
        <div className="flex flex-col gap-1">
          <p className="text-[18px] font-medium leading-[1.2] text-text-1">{card.name}</p>
          <p className="text-[11px] leading-normal text-text-2">
            {card.location} · {card.edited}
          </p>
        </div>
        <div className="flex w-[84px] gap-1" aria-hidden>
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className={`size-1 rounded-full ${index < card.dots ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex">
            {card.people.map((person, index) => (
              <span
                key={person.initials}
                className={`inline-flex size-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-semibold text-[#111] ${
                  index === 0 ? "" : "-ml-1.5"
                }`}
                style={{ backgroundColor: person.color }}
              >
                {person.initials}
              </span>
            ))}
          </div>
          <div className="flex w-[120px] flex-col gap-[5px]">
            <p className="text-right text-[9px] font-semibold uppercase tracking-[0.9px] text-text-3">Confidence</p>
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-pill ${index < card.confidence ? "bg-accent" : "bg-[#f1f1ee]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const className = list
    ? "flex overflow-hidden rounded-card border border-border bg-surface shadow-card"
    : "flex h-[300px] w-full max-w-[380px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card";

  if (!card.href) {
    return <article className={className}>{body}</article>;
  }
  return (
    <Link href={card.href} className={`${focusRing} ${className}`}>
      {body}
    </Link>
  );
}
