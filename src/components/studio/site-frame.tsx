"use client";

import { PreviewPanel } from "@/components/studio/preview-panel";
import { RouteTransition } from "@/components/studio/route-transition";
import { Topbar } from "@/components/studio/topbar";
import { WIDE_STEPS, isSiteStep, type SiteStepId } from "@/lib/studio/steps";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteFrame({
  slug,
  name,
  location,
  revision,
  previewToken,
  sites,
  complete,
  children,
}: {
  slug: string;
  name: string;
  location: string | null;
  revision: string;
  previewToken: string;
  sites: { slug: string; name: string }[];
  complete: Record<SiteStepId, boolean>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "overview";
  const step: SiteStepId = isSiteStep(segment) ? segment : "overview";
  const wide = WIDE_STEPS.includes(step);

  return (
    <div className="min-h-screen">
      <Topbar sites={sites} slug={slug} step={step} complete={complete} />
      <div
        className={
          wide
            ? "px-6 pb-10"
            : "px-6 pb-10 min-[1100px]:grid min-[1100px]:grid-cols-2 min-[1100px]:items-start min-[1100px]:gap-8 min-[1100px]:pr-6"
        }
      >
        <div className={wide ? "min-w-0" : "min-w-0 min-[1100px]:max-w-[600px]"}>
          <RouteTransition>{children}</RouteTransition>
        </div>
        {wide ? null : (
          <div className="hidden min-[1100px]:block">
            <div className="sticky top-0 h-[calc(100vh-72px)] pb-6">
              <PreviewPanel
                slug={slug}
                name={name}
                location={location}
                revision={revision}
                previewToken={previewToken}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
