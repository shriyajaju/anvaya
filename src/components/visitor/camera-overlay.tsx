"use client";

import { ConfidenceChip } from "@/components/visitor/parts";
import { overlayBlend } from "@/lib/reconstruction/overlay-config";
import type { VisitorLevel } from "@/lib/visitor/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VisitorRegion } from "@/components/visitor/reconstruction-screen";

type Step = "align" | "reveal";

export function CameraOverlay({
  open,
  onClose,
  onFallback,
  slug,
  elementId,
  level,
  label,
  sourcePhotoUrl,
  reconstructionUrl,
  edgeGuideUrl,
  wireframeUrl,
  regions,
  viewpointLabel,
  viewpointNote,
}: {
  open: boolean;
  onClose: () => void;
  onFallback: (reason: string) => void;
  slug: string;
  elementId: string;
  level: VisitorLevel;
  label: string;
  sourcePhotoUrl: string | null;
  reconstructionUrl: string | null;
  edgeGuideUrl: string | null;
  wireframeUrl: string | null;
  regions: VisitorRegion[];
  viewpointLabel: string | null;
  viewpointNote: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("align");
  const [opacity, setOpacity] = useState(70);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [aspect, setAspect] = useState(4 / 3);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const blend = overlayBlend();
  const useScreen = blend === "screen" && Boolean(wireframeUrl);
  const overlaySrc = useScreen ? wireframeUrl : reconstructionUrl;
  const focusRegions = regions.filter((region) => region.elementId === elementId);
  const shown = focusRegions.length > 0 ? focusRegions : regions;

  const stopCamera = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      onFallback("Camera needs a secure (HTTPS) connection.");
      return;
    }
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        onFallback("Camera access is off or unavailable. You can still use Then / Now.");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onFallback, stopCamera]);

  useEffect(() => {
    if (!sourcePhotoUrl) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = sourcePhotoUrl;
  }, [sourcePhotoUrl]);

  function onPointerDown(event: React.PointerEvent) {
    if (step !== "reveal") return;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current || step !== "reveal") return;
    setOffset({
      x: drag.current.ox + (event.clientX - drag.current.x),
      y: drag.current.oy + (event.clientY - drag.current.y),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  function onTouchStart(event: React.TouchEvent) {
    if (step !== "reveal" || event.touches.length !== 2) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinch.current = { dist, scale };
  }

  function onTouchMove(event: React.TouchEvent) {
    if (step !== "reveal" || event.touches.length !== 2 || !pinch.current) return;
    event.preventDefault();
    const [a, b] = [event.touches[0], event.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const next = Math.min(2.5, Math.max(0.6, pinch.current.scale * (dist / pinch.current.dist)));
    setScale(next);
  }

  function onTouchEnd() {
    pinch.current = null;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" role="dialog" aria-label="View through camera">
      <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted autoPlay />

      <div
        ref={stageRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="relative max-h-full max-w-full"
          style={{
            aspectRatio: `${aspect}`,
            width: "min(100vw, calc(100vh * " + aspect + "))",
            height: "min(100vh, calc(100vw / " + aspect + "))",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {step === "align" && edgeGuideUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={edgeGuideUrl} alt="" className="absolute inset-0 size-full object-contain opacity-90" />
          ) : null}
          {step === "reveal" && overlaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={overlaySrc}
              alt="Imagined reconstruction"
              className="absolute inset-0 size-full object-contain"
              style={{
                opacity: useScreen ? 1 : opacity / 100,
                mixBlendMode: useScreen ? "screen" : "normal",
              }}
            />
          ) : null}
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
                    fillOpacity={step === "reveal" ? 0.18 : 0.08}
                    stroke={stroke}
                    strokeWidth={0.45}
                  />
                </Link>
              );
            })}
          </svg>
          <p className="absolute bottom-3 left-3 rounded-pill bg-black/55 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white">
            {label}
          </p>
        </div>
      </div>

      <div className="absolute right-4 top-[58px] z-20">
        <ConfidenceChip level={level} href={`/${slug}/hdwk/${elementId}`} />
      </div>

      <div className="absolute inset-x-4 top-[54px] z-20 flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-pill border border-white/25 bg-black/40 text-[13px] backdrop-blur"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          aria-label="Close camera"
        >
          ✕
        </button>
        <div className="max-w-[220px] rounded-[16px] bg-black/45 px-3 py-2 text-right backdrop-blur">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/90">
            {viewpointLabel ?? "Viewpoint"}
          </p>
          {viewpointNote ? <p className="mt-1 text-[12px] leading-4 text-white/70">{viewpointNote}</p> : null}
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-8 z-20 flex flex-col gap-3">
        {step === "align" ? (
          <>
            <p className="rounded-[16px] bg-black/50 px-4 py-3 text-center text-[14px] leading-5 text-white/90 backdrop-blur">
              Stand at the marker and line up the outline with the structure.
            </p>
            <button
              type="button"
              className="flex h-[52px] w-full items-center justify-center rounded-card bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black"
              onClick={() => setStep("reveal")}
            >
              Lined up
            </button>
          </>
        ) : (
          <>
            <label className="flex items-center gap-3 rounded-[16px] bg-black/50 px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-white/80 backdrop-blur">
              Opacity
              <input
                type="range"
                min={0}
                max={100}
                value={opacity}
                aria-label="Reconstruction opacity"
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="min-w-0 flex-1 accent-white"
              />
              <span className="w-10 text-right tabular-nums">{opacity}%</span>
            </label>
            <p className="text-center text-[12px] text-white/65">Pinch to scale · drag to nudge</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex h-[52px] items-center justify-center rounded-card border border-white/30 bg-white/10 text-[11px] font-medium uppercase tracking-[0.08em]"
                onClick={() => {
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                  setOpacity(70);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                className="flex h-[52px] items-center justify-center rounded-card bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
