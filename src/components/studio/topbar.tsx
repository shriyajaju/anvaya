"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { SITE_STEPS, type SiteStepId } from "@/lib/studio/steps";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export function StepTabs({
  slug,
  step,
  complete,
}: {
  slug: string;
  step: SiteStepId;
  complete: Record<SiteStepId, boolean>;
}) {
  const motionEnabled = useMotionEnabled();
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto">
      {SITE_STEPS.map((item) => {
        const active = item.id === step;
        const done = complete[item.id] && !active;
        return (
          <Link
            key={item.id}
            href={`/s/${slug}/${item.id}`}
            aria-current={active ? "page" : undefined}
            className={`${focusRing} relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium leading-5 ${
              active ? "text-on-primary" : "text-text-2"
            }`}
          >
            {active ? (
              <motion.span
                layoutId={motionEnabled ? "site-step" : undefined}
                className="absolute inset-0 rounded-pill bg-primary"
                transition={motionEnabled ? spring : { duration: 0 }}
              />
            ) : null}
            <span className="relative inline-flex items-center gap-1.5">
              {done ? <span aria-hidden className="size-1.5 rounded-full bg-accent" /> : null}
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function SiteSwitcher({
  sites,
  slug,
  step,
}: {
  sites: { slug: string; name: string }[];
  slug: string;
  step: SiteStepId;
}) {
  const current = sites.find((site) => site.slug === slug);
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`${focusRing} inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 text-[15px] font-medium leading-6 text-text-1 shadow-card`}
      >
        <span className="max-w-[10rem] truncate">{current?.name ?? slug}</span>
        <ChevronDown aria-hidden className="size-4 text-text-2" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-50 w-56 rounded-card bg-surface p-2 shadow-float outline-none">
          {sites.map((site) => (
            <Link
              key={site.slug}
              href={`/s/${site.slug}/${step}`}
              className={`${focusRing} block rounded-button px-2 py-1.5 text-[13px] leading-5 ${
                site.slug === slug ? "text-text-1" : "text-text-2"
              }`}
            >
              {site.name}
            </Link>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Topbar({
  sites,
  slug,
  step,
  complete,
}: {
  sites: { slug: string; name: string }[];
  slug: string;
  step: SiteStepId;
  complete: Record<SiteStepId, boolean>;
}) {
  return (
    <header className="flex h-[72px] items-center gap-4 px-6">
      <SiteSwitcher sites={sites} slug={slug} step={step} />
      <StepTabs slug={slug} step={step} complete={complete} />
      <Button label="Update" size="Small" />
    </header>
  );
}
