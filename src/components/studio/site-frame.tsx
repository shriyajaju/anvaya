"use client";

import { EvidenceMap } from "@/components/studio/evidence-map";
import { MapCard } from "@/components/studio/map-card";
import { PreviewPanel } from "@/components/studio/preview-panel";
import { RouteTransition } from "@/components/studio/route-transition";
import { TimelineCanvas } from "@/components/studio/timeline-canvas";
import { Topbar } from "@/components/studio/topbar";
import { WorkspaceProvider, useWorkspace } from "@/components/studio/workspace-context";
import type { SurvivalElement, TimelineData } from "@/lib/studio/records";
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
  pins,
  timeline,
  caption,
  children,
}: {
  slug: string;
  name: string;
  location: string | null;
  revision: string;
  previewToken: string;
  sites: { slug: string; name: string }[];
  complete: Record<SiteStepId, boolean>;
  pins: SurvivalElement[];
  timeline: TimelineData;
  caption: string;
  children: ReactNode;
}) {
  return (
    <WorkspaceProvider pins={pins} timeline={timeline} caption={caption}>
      <SiteFrameBody
        slug={slug}
        name={name}
        location={location}
        revision={revision}
        previewToken={previewToken}
        sites={sites}
        complete={complete}
      >
        {children}
      </SiteFrameBody>
    </WorkspaceProvider>
  );
}

function SiteFrameBody({
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
  const { pins, caption, timelineView, evidenceView } = useWorkspace();
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
              {step === "evidence" && evidenceView !== "interpretations" ? (
              <PreviewPanel
                slug={slug}
                name={name}
                location={location}
                revision={revision}
                previewToken={previewToken}
                mode="map"
                openLabel={name}
                map={<EvidenceMap slug={slug} />}
              />
            ) : step === "document" ? (
              <PreviewPanel
                slug={slug}
                name={name}
                location={location}
                revision={revision}
                previewToken={previewToken}
                mode="map"
                openLabel={name}
                map={<MapCard pins={pins} title="Plan · condition" />}
              />
            ) : step === "timeline" && timelineView === "periods" ? (
              <TimelineCanvas />
            ) : (
              <PreviewPanel
                slug={slug}
                name={name}
                location={location}
                revision={revision}
                previewToken={previewToken}
                caption={step === "overview" ? caption : undefined}
                openLabel={name}
              />
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
