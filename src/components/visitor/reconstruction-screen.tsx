"use client";

import { CameraOverlay } from "@/components/visitor/camera-overlay";
import { Sheet, ThenNowSlider } from "@/components/visitor/ar-controls";
import { ActionGrid, ConfidenceChip, TopNav, VButton } from "@/components/visitor/parts";
import type { VisitorLevel } from "@/lib/visitor/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export type VisitorRegion = {
  id: string;
  elementId: string;
  shape: { x: number; y: number }[];
  confidence: VisitorLevel;
  name: string;
};

export function ReconstructionScreen({
  slug,
  back,
  title,
  elementId,
  elementName,
  year,
  level,
  sourcePhotoUrl,
  reconstructionUrl,
  edgeGuideUrl,
  wireframeUrl,
  origin,
  regions,
  label,
  viewpointLabel,
  viewpointNote,
  siteId,
  sourcePhotoId,
  reconstructionId,
  startCamera = false,
}: {
  slug: string;
  back: string;
  title: string;
  elementId: string;
  elementName: string;
  year: number | null;
  level: VisitorLevel;
  sourcePhotoUrl: string | null;
  reconstructionUrl: string | null;
  edgeGuideUrl: string | null;
  wireframeUrl: string | null;
  origin: "generated" | "uploaded" | null;
  regions: VisitorRegion[];
  label: string;
  viewpointLabel: string | null;
  viewpointNote: string | null;
  siteId: string;
  sourcePhotoId: string | null;
  reconstructionId: string | null;
  startCamera?: boolean;
}) {
  const [then, setThen] = useState(80);
  const [cameraOpen, setCameraOpen] = useState(Boolean(startCamera));
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [guideUrl, setGuideUrl] = useState(edgeGuideUrl);
  const focusRegions = regions.filter((region) => region.elementId === elementId);
  const shown = focusRegions.length > 0 ? focusRegions : regions;

  useEffect(() => {
    if (!cameraOpen || guideUrl || !sourcePhotoId) return;
    void fetch("/api/edge-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, assetId: sourcePhotoId, reconstructionId }),
    })
      .then((response) => response.json())
      .then((body: { url?: string }) => {
        if (body.url) setGuideUrl(body.url);
      })
      .catch(() => undefined);
  }, [cameraOpen, guideUrl, siteId, sourcePhotoId, reconstructionId]);

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[var(--color-camera-from)] to-[var(--color-camera-to)] text-text-1">
      <TopNav back={back} title={title} info={`/${slug}/hdwk/${elementId}`} />
      <div className="absolute left-5 top-[220px] z-10">
        <ThenNowSlider value={then} onChange={setThen} />
      </div>
      <div className="absolute inset-x-6 top-[200px] h-[300px] overflow-hidden rounded-[20px] bg-black/20">
        {sourcePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sourcePhotoUrl} alt="Existing remains" className="absolute inset-0 size-full object-cover" />
        ) : null}
        {reconstructionUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reconstructionUrl}
            alt="Imagined reconstruction"
            className="absolute inset-0 size-full object-cover"
            style={{ opacity: then / 100 }}
          />
        ) : (
          <p className="flex size-full items-center justify-center px-6 text-center text-[14px] text-text-2">
            No reconstruction image in this version yet.
          </p>
        )}
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {shown.map((region) => {
            const stroke =
              region.confidence === "high"
                ? "var(--color-conf-high)"
                : region.confidence === "medium"
                  ? "var(--color-conf-medium)"
                  : "var(--color-conf-low)";
            return (
              <Link key={region.id} href={`/${slug}/hdwk/${region.elementId}`}>
                <polygon
                  points={region.shape.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill={stroke}
                  fillOpacity={0.2}
                  stroke={stroke}
                  strokeWidth={0.5}
                />
              </Link>
            );
          })}
        </svg>
        <p className="absolute bottom-3 left-3 rounded-pill bg-black/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white">
          {label}
        </p>
      </div>
      <div className="absolute right-6 top-[280px] z-10">
        <ConfidenceChip level={level} href={`/${slug}/hdwk/${elementId}`} />
      </div>
      <p className="absolute inset-x-6 top-[510px] text-center text-[13px] leading-5 text-text-3">
        Tap a coloured region to see how we know.
      </p>
      {cameraNote ? (
        <p className="absolute inset-x-6 top-[545px] text-center text-[12px] leading-4 text-text-2">{cameraNote}</p>
      ) : null}
      <div className="absolute inset-x-6 top-[560px] z-10">
        <VButton
          onClick={() => {
            window.localStorage.setItem("anvaya-ar-started", "1");
            window.dispatchEvent(new Event("anvaya-ar-started"));
            setThen(100);
          }}
        >
          See the reconstruction
        </VButton>
      </div>
      <Sheet>
        <h1 className="font-visitor text-[28px] font-normal leading-[34px]">{elementName}</h1>
        <p className="text-[13px] leading-5 text-text-2">
          {title}
          {year ? ` · reconstruction of c. ${year} CE` : ""}
          {origin ? ` · ${origin === "uploaded" ? "uploaded" : "AI-assisted"}` : ""}
        </p>
        {viewpointLabel ? (
          <p className="text-[13px] leading-5 text-text-3">
            {viewpointLabel}
            {viewpointNote ? ` — ${viewpointNote}` : ""}
          </p>
        ) : null}
        <button
          type="button"
          className="flex h-[52px] w-full items-center justify-center rounded-card border border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-1"
          onClick={() => {
            setCameraNote(null);
            setCameraOpen(true);
          }}
        >
          View through camera
        </button>
        <ActionGrid slug={slug} elementId={elementId} />
      </Sheet>

      {cameraOpen ? (
        <CameraOverlay
          key="camera-overlay"
          open
          onClose={() => setCameraOpen(false)}
          onFallback={(reason) => {
            setCameraOpen(false);
            setCameraNote(reason);
          }}
          slug={slug}
          elementId={elementId}
          level={level}
          label={label}
          sourcePhotoUrl={sourcePhotoUrl}
          reconstructionUrl={reconstructionUrl}
          edgeGuideUrl={guideUrl}
          wireframeUrl={wireframeUrl}
          regions={regions}
          viewpointLabel={viewpointLabel}
          viewpointNote={viewpointNote}
        />
      ) : null}
    </main>
  );
}
