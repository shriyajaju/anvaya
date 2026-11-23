"use client";

import { AccountMenu } from "@/components/studio/account-menu";
import { focusRing } from "@/components/ui/motion";
import { Tooltip } from "@/components/ui/tooltip";
import { useDarkTheme } from "@/lib/theme";
import {
  Archive,
  BarChart3,
  Home,
  Landmark,
  Layers,
  Moon,
  Settings,
  Sun,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/sites",
    label: "Sites",
    icon: Landmark,
    match: (path: string) => path === "/sites" || path.startsWith("/sites/") || path.startsWith("/s/"),
  },
  { href: "/assets", label: "Assets", icon: Layers, match: (path: string) => path.startsWith("/assets") },
  {
    href: "/review-queue",
    label: "Review queue",
    icon: ClipboardCheck,
    match: (path: string) => path.startsWith("/review-queue"),
    badge: true,
  },
  { href: "/archive", label: "Archive", icon: Archive, match: (path: string) => path.startsWith("/archive") },
  { href: "/analytics", label: "Analytics", icon: BarChart3, match: (path: string) => path.startsWith("/analytics") },
] as const;

export function Rail({
  name,
  initials,
  title,
  orgs,
  reviewCount,
  siteSlug,
  previewToken,
}: {
  name: string;
  initials: string;
  title: string | null;
  orgs: { orgId: string; name: string; current: boolean }[];
  reviewCount: number;
  siteSlug: string | null;
  previewToken: string | null;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Studio"
      className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-between gap-1 border-t border-border bg-surface px-3 shadow-float min-[1100px]:inset-x-auto min-[1100px]:bottom-6 min-[1100px]:left-6 min-[1100px]:top-6 min-[1100px]:h-auto min-[1100px]:w-[72px] min-[1100px]:flex-col min-[1100px]:justify-start min-[1100px]:rounded-rail min-[1100px]:border-0 min-[1100px]:px-0 min-[1100px]:py-4 min-[1100px]:shadow-card"
    >
      <AccountMenu
        name={name}
        initials={initials}
        title={title}
        orgs={orgs}
        siteSlug={siteSlug}
        previewToken={previewToken}
      />
      <div className="flex flex-1 items-center justify-around min-[1100px]:mt-4 min-[1100px]:flex-none min-[1100px]:flex-col min-[1100px]:gap-1">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Tooltip key={item.href} label={item.label} side="top">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${focusRing} relative flex size-12 items-center justify-center rounded-rail-item ${
                  active ? "text-text-1" : "text-text-2"
                }`}
              >
                {active ? (
                  <>
                    <span className="absolute left-1/2 top-1 hidden h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary max-[1099px]:block" />
                    <span className="absolute left-1 top-1/2 hidden h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary min-[1100px]:block" />
                  </>
                ) : null}
                <Icon aria-hidden className="size-5" />
                {"badge" in item && reviewCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-review px-1 text-[10px] font-medium leading-none text-white">
                    {reviewCount}
                  </span>
                ) : null}
              </Link>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex items-center min-[1100px]:mt-auto min-[1100px]:flex-col">
        <ThemeButton />
        <Tooltip label="Settings" side="top">
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`${focusRing} relative flex size-12 items-center justify-center rounded-rail-item ${
            pathname.startsWith("/settings") ? "text-text-1" : "text-text-2"
          }`}
        >
          {pathname.startsWith("/settings") ? (
            <span className="absolute left-1 top-1/2 hidden h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary min-[1100px]:block" />
          ) : null}
          <Settings aria-hidden className="size-5" />
        </Link>
        </Tooltip>
      </div>
    </nav>
  );
}

function ThemeButton() {
  const [dark, setDark] = useDarkTheme();
  const Icon = dark ? Moon : Sun;
  return (
    <Tooltip label="Dark mode" side="top">
      <button
        type="button"
        aria-pressed={dark}
        aria-label="Dark mode"
        onClick={() => setDark(!dark)}
        className={`${focusRing} flex size-12 items-center justify-center rounded-rail-item text-text-2`}
      >
        <Icon aria-hidden className="size-5" />
      </button>
    </Tooltip>
  );
}
