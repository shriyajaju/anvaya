"use client";

import { Avatar } from "@/components/ui/avatar";
import { ConfidenceBar } from "@/components/ui/bars";
import { Card } from "@/components/ui/card";
import { ChipStatus, type StatusState } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SITE_STEPS, type SiteStepId } from "@/lib/studio/steps";
import { spring, useMotionEnabled, focusRing } from "@/components/ui/motion";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type SitesBoardSite = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  version: string | null;
  steps: Record<SiteStepId, boolean>;
  counts: { high: number; medium: number; low: number };
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In review" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
] as const;

const STATUS_LABEL: Record<SitesBoardSite["status"], StatusState> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

export function SitesBoard({
  sites,
  members,
}: {
  sites: SitesBoardSite[];
  members: { initials: string }[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const motionEnabled = useMotionEnabled();
  const counts = useMemo(() => {
    return {
      all: sites.length,
      draft: sites.filter((site) => site.status === "draft").length,
      in_review: sites.filter((site) => site.status === "in_review").length,
      published: sites.filter((site) => site.status === "published").length,
      archived: sites.filter((site) => site.status === "archived").length,
    };
  }, [sites]);
  const visible = sites.filter((site) => {
    const haystack = `${site.name} ${site.location ?? ""}`.toLowerCase();
    if (query && !haystack.includes(query.trim().toLowerCase())) return false;
    return filter === "all" || site.status === filter;
  });

  return (
    <div className="flex flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[40px] font-light leading-[48px]">My sites</h1>
        <div className="flex items-center gap-3">
          <label className="flex h-[52px] w-60 items-center gap-2 rounded-card bg-surface px-5 shadow-card">
            <Search aria-hidden className="size-4 text-text-2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sites"
              aria-label="Search sites"
              className="w-full bg-transparent text-[15px] leading-6 text-text-1 outline-none placeholder:text-text-2"
            />
          </label>
          <Link
            href="/sites/new"
            className={`${focusRing} inline-flex h-9 items-center rounded-button bg-primary px-3.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-on-primary`}
          >
            + New site
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Site status">
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(item.id)}
              className={`${focusRing} relative inline-flex h-9 items-center gap-2 rounded-pill px-4 text-[15px] font-medium leading-6 ${
                selected ? "text-on-primary" : "text-text-2"
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId={motionEnabled ? "site-filter" : undefined}
                  className="absolute inset-0 rounded-pill bg-primary"
                  transition={motionEnabled ? spring : { duration: 0 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-pill bg-surface-2" />
              )}
              <span className="relative">{item.label}</span>
              <span className="relative opacity-60">{counts[item.id]}</span>
            </button>
          );
        })}
      </div>

      {sites.length === 0 ? (
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
      ) : (
        <div className="grid max-w-[1188px] grid-cols-1 gap-6 md:grid-cols-2 min-[1100px]:grid-cols-3">
          <Link
            href="/sites/new"
            className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface text-[15px] leading-6 text-text-2 shadow-card"
          >
            <Plus aria-hidden className="size-6" />
            Create a new site
          </Link>
          {visible.map((site) => (
            <Link key={site.id} href={`/s/${site.slug}/overview`} className={site.status === "archived" ? "opacity-60" : ""}>
              <Card padding="None" className="h-[300px] overflow-hidden">
                <div className="flex h-[150px] items-start justify-between bg-surface-2 p-4">
                  <ChipStatus state={STATUS_LABEL[site.status]} />
                  {site.version ? (
                    <span className="inline-flex h-6 items-center rounded-pill bg-surface px-2.5 text-[11px] font-medium text-text-2">
                      {site.version.startsWith("v") ? site.version : `v${site.version}`}
                    </span>
                  ) : null}
                </div>
                <div className="flex h-[150px] flex-col gap-2 p-5">
                  <div>
                    <p className="text-[18px] font-normal leading-[26px]">{site.name}</p>
                    <p className="text-[13px] leading-5 text-text-2">{site.location}</p>
                  </div>
                  <div className="flex w-[102px] gap-1.5" aria-label="Workflow">
                    {SITE_STEPS.map((step) => (
                      <span
                        key={step.id}
                        className={`size-1.5 rounded-full ${site.steps[step.id] ? "bg-accent" : "bg-border"}`}
                      />
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex">
                      {members.slice(0, 3).map((member, index) => (
                        <span key={member.initials} className={index === 0 ? "" : "-ml-2"}>
                          <Avatar initials={member.initials} size="24" ring />
                        </span>
                      ))}
                    </div>
                    <ConfidenceBar counts={site.counts} legend={false} className="w-[120px]" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
