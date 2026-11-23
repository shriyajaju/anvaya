"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { signOut, switchOrganisation } from "@/server/auth";
import { useDarkTheme } from "@/lib/theme";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import Link from "next/link";

export function AccountMenu({
  name,
  initials,
  title,
  orgs,
  siteSlug,
  previewToken,
}: {
  name: string;
  initials: string;
  title: string | null;
  orgs: { orgId: string; name: string; current: boolean }[];
  siteSlug: string | null;
  previewToken: string | null;
}) {
  const motionEnabled = useMotionEnabled();
  const [dark, setTheme] = useDarkTheme();
  const ThemeIcon = dark ? Moon : Sun;

  return (
    <Popover.Root>
      <Popover.Trigger
        className={`${focusRing} flex size-10 items-center justify-center rounded-full bg-surface-2 text-[13px] font-medium text-text-2`}
        aria-label="Account"
      >
        {initials}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="right" align="start" sideOffset={16} className="z-50 outline-none">
          <motion.div
            initial={motionEnabled ? { scale: 0.96, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="w-64 origin-top-left rounded-card bg-surface p-3 text-text-1 shadow-float"
          >
            <Link href="/settings/profile" className={`${focusRing} block rounded-button px-2 py-2`}>
              <p className="text-[15px] leading-6">{name}</p>
              {title ? <p className="text-[13px] leading-5 text-text-2">{title}</p> : null}
            </Link>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-button px-2 py-2">
              <span className="flex items-center gap-2 text-[13px] text-text-1">
                <ThemeIcon aria-hidden className="size-4 text-text-2" />
                Dark mode
              </span>
              <Toggle label="Dark mode" state={dark} onStateChange={setTheme} />
            </div>
            <div className="mt-1 border-t border-border pt-2">
              <p className="px-2 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">
                Organisation
              </p>
              <div className="mt-1 flex flex-col">
                {orgs.map((org) => (
                  <form key={org.orgId} action={switchOrganisation}>
                    <input type="hidden" name="orgId" value={org.orgId} />
                    <button
                      type="submit"
                      className={`${focusRing} flex w-full items-center justify-between rounded-button px-2 py-1.5 text-left text-[13px] leading-5 ${
                        org.current ? "text-text-1" : "text-text-2"
                      }`}
                    >
                      {org.name}
                      {org.current ? <span className="text-[11px] text-accent">Current</span> : null}
                    </button>
                  </form>
                ))}
              </div>
            </div>
            {siteSlug && previewToken ? (
              <a
                href={`/${siteSlug}?preview=${encodeURIComponent(previewToken)}`}
                target="_blank"
                rel="noreferrer"
                className={`${focusRing} mt-1 block rounded-button px-2 py-1.5 text-[13px] text-text-1`}
              >
                Open visitor site
              </a>
            ) : null}
            <form action={signOut} className="mt-1 border-t border-border pt-2">
              <button type="submit" className={`${focusRing} w-full rounded-button px-2 py-1.5 text-left text-[13px] text-text-2`}>
                Sign out
              </button>
            </form>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
