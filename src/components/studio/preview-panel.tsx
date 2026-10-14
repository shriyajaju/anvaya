"use client";

import { PhoneFrame } from "@/components/studio/phone-frame";
import { Toggle } from "@/components/ui/toggle";
import { focusRing } from "@/components/ui/motion";
import { VisitorPreview } from "@/components/visitor/visitor-preview";
import { useState, type ReactNode } from "react";

export function PreviewPanel({
  slug,
  name,
  location,
  revision,
  previewToken,
  mode = "phone",
  map,
}: {
  slug: string;
  name: string;
  location: string | null;
  revision: string;
  previewToken: string;
  mode?: "phone" | "map";
  map?: ReactNode;
}) {
  const [dark, setDark] = useState(true);
  const openHref = `/${slug}?preview=${encodeURIComponent(previewToken)}`;

  return (
    <section className="flex h-full min-h-[640px] flex-col rounded-[20px] bg-[radial-gradient(120%_80%_at_50%_28%,var(--color-preview-from),var(--color-preview-via)_52%,var(--color-preview-to))] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex h-9 items-center rounded-pill bg-[var(--color-glass-url)] px-3.5 text-[11px] font-medium text-[color:var(--color-glass-url-text)]">
          anvaya.site/{slug}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[color:var(--color-glass-caption)]">Dark</span>
          <Toggle label="Visitor theme" state={dark} onStateChange={setDark} />
          <a
            href={openHref}
            target="_blank"
            rel="noreferrer"
            className={`${focusRing} inline-flex h-10 items-center rounded-button bg-primary px-[18px] text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-on-primary`}
          >
            Open
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
            <VisitorPreview name={name} location={location} preview framed />
          </PhoneFrame>
        )}
      </div>
    </section>
  );
}
