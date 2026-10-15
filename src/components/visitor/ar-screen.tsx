"use client";

import { ModelViewerAR, Sheet, ThenNowSlider } from "@/components/visitor/ar-controls";
import { ModelFallback } from "@/components/visitor/model-fallback";
import { ActionGrid, ConfidenceChip, TopNav, VButton } from "@/components/visitor/parts";
import { useEffect, useRef, useState } from "react";

export function ArScreen({
  slug,
  back,
  title,
  elementId,
  elementName,
  year,
  level,
  modelUrl,
}: {
  slug: string;
  back: string;
  title: string;
  elementId: string;
  elementName: string;
  year: number | null;
  level: "high" | "medium" | "low";
  modelUrl: string | null;
}) {
  const [then, setThen] = useState(80);
  const [fallback, setFallback] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const viewer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const permissions = navigator.permissions;
    if (!permissions?.query) return;
    void permissions.query({ name: "camera" as PermissionName }).then((status) => {
      setCameraDenied(status.state === "denied");
    }).catch(() => undefined);
  }, []);
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[var(--color-camera-from)] to-[var(--color-camera-to)] text-text-1">
      <TopNav back={back} title={title} info={`/${slug}/hdwk/${elementId}`} />
      <div className="absolute left-5 top-[300px] z-10">
        <ThenNowSlider value={then} onChange={setThen} />
      </div>
      <div ref={viewer} className="absolute inset-x-16 top-[240px] h-[280px]">
        {cameraDenied ? <p className="mb-2 text-center text-[13px] text-text-2">Camera access is off. You can still look at the model here.</p> : null}
        {modelUrl && fallback ? <ModelFallback src={modelUrl} opacity={then / 100} /> : null}
        {modelUrl && !fallback ? <ModelViewerAR src={modelUrl} opacity={then / 100} label={elementName} onUnsupported={() => setFallback(true)} /> : null}
      </div>
      <div className="absolute right-6 top-[320px] z-10">
        <ConfidenceChip level={level} href={`/${slug}/hdwk/${elementId}`} />
      </div>
      <p className="absolute inset-x-6 top-[540px] text-center text-[13px] leading-5 text-text-3">
        Place the reconstruction on a surface.
      </p>
      <div className="absolute inset-x-6 top-[580px] z-10">
        <VButton
          onClick={() => {
            const node = viewer.current?.querySelector("model-viewer") as (HTMLElement & { activateAR?: () => void }) | null;
            node?.activateAR?.();
            window.localStorage.setItem("anvaya-ar-started", "1");
            window.dispatchEvent(new Event("anvaya-ar-started"));
          }}
        >
          Start AR
        </VButton>
      </div>
      <Sheet>
        <h1 className="font-visitor text-[28px] font-normal leading-[34px]">{elementName}</h1>
        <p className="text-[13px] leading-5 text-text-2">
          {title}
          {year ? ` · reconstruction of c. ${year} CE` : ""}
        </p>
        <ActionGrid slug={slug} elementId={elementId} />
      </Sheet>
    </main>
  );
}
