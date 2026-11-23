"use client";

import { PhoneFrame } from "@/components/studio/phone-frame";
import { focusRing } from "@/components/ui/motion";
import { VisitorPreview } from "@/components/visitor/visitor-preview";
import { Moon, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";

export function PreviewPanel({
  slug,
  name,
  location,
  description,
  revision,
  previewToken,
  mode = "phone",
  map,
  caption,
  openLabel = "Open",
  watermark = true,
  stats,
  address,
  ribbon,
}: {
  slug: string;
  name: string;
  location: string | null;
  description?: string | null;
  revision: string;
  previewToken: string;
  mode?: "phone" | "map";
  map?: ReactNode;
  caption?: string;
  openLabel?: string;
  watermark?: boolean;
  stats?: { elements: number; sources: number; stories: number };
  address?: string;
  ribbon?: string[];
}) {
  const [dark, setDark] = useState(() =>
    typeof window === "undefined" ? true : window.localStorage.getItem("anvaya-preview-theme") !== "light",
  );
  const openHref = `/${slug}${address ? `/${address}` : ""}?preview=${encodeURIComponent(previewToken)}`;

  function setTheme(next: boolean) {
    setDark(next);
    window.localStorage.setItem("anvaya-preview-theme", next ? "dark" : "light");
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[20px] bg-[radial-gradient(120%_80%_at_50%_28%,var(--color-preview-from),var(--color-preview-via)_52%,var(--color-preview-to))] p-6">
      <div className="flex items-center gap-3">
        <p className="inline-flex h-10 min-w-0 items-center truncate rounded-pill bg-[color-mix(in_srgb,var(--color-glass-caption)_8%,transparent)] px-4 text-[14px] leading-5 text-[color:var(--color-glass-caption)] backdrop-blur-[8px]">
          anvaya.site/{slug}{address ? `/${address}` : ""}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label={dark ? "Switch preview to light" : "Switch preview to dark"}
            aria-pressed={dark}
            onClick={() => setTheme(!dark)}
            className={`${focusRing} inline-flex size-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-glass-caption)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-glass-caption)_12%,transparent)] text-[color:var(--color-glass-caption)] backdrop-blur-[8px]`}
          >
            {dark ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
          </button>
          <a
            href={openHref}
            target="_blank"
            rel="noreferrer"
            className={`${focusRing} inline-flex h-12 items-center rounded-button bg-[var(--color-glass-url)] px-5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-[color:var(--color-glass-url-text)]`}
          >
            {openLabel === "Preview" ? "Preview" : `Open ${openLabel}`}
          </a>
        </div>
      </div>
      <div className="mt-6 min-h-0 flex-1">
        {mode === "map" ? (
          <div data-slot="map" className="h-full">
            {map}
          </div>
        ) : (
          <PhoneFrame revision={revision} theme={dark ? "dark" : "light"}>
            <VisitorPreview
              name={name}
              location={location}
              description={description}
              preview={watermark}
              framed
              stats={stats}
            />
          </PhoneFrame>
        )}
      </div>
      {caption || ribbon ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          {caption ? <p className="text-[13px] leading-5 text-[color:var(--color-glass-caption)] opacity-70">{caption}</p> : <span />}
          {ribbon ? (
            <span className="inline-flex overflow-hidden rounded-pill border border-white/20 text-[11px] text-[color:var(--color-glass-caption)]">
              {ribbon.map((year) => (
                <span key={year} className="px-2.5 py-1">
                  {year}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
