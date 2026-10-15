"use client";

import { spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

type ViewerElement = HTMLElement & { activateAR?: () => void };

export function ModelViewerAR({
  src,
  usdz,
  opacity,
  label,
}: {
  src: string;
  usdz?: string | null;
  opacity: number;
  label: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = holder.current;
    if (!parent) return;
    let cancelled = false;
    void import("@google/model-viewer").then(() => {
      if (cancelled || !holder.current) return;
      const node = document.createElement("model-viewer") as ViewerElement;
      node.setAttribute("src", src);
      node.setAttribute("alt", label);
      if (usdz) node.setAttribute("ios-src", usdz);
      node.setAttribute("ar", "");
      node.setAttribute("ar-modes", "webxr scene-viewer quick-look");
      node.setAttribute("camera-controls", "");
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.background = "transparent";
      node.style.opacity = "1";
      holder.current.replaceChildren(node);
    });
    return () => {
      cancelled = true;
    };
  }, [label, src, usdz]);
  useEffect(() => {
    const node = holder.current?.querySelector("model-viewer");
    if (node instanceof HTMLElement) node.style.opacity = String(opacity);
  }, [opacity]);

  return <div ref={holder} className="h-full w-full" />;
}

export function startAR(node: ViewerElement | null) {
  node?.activateAR?.();
  window.localStorage.setItem("anvaya-ar-started", "1");
  window.dispatchEvent(new Event("anvaya-ar-started"));
}

export function ThenNowSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex h-[220px] w-12 flex-col items-center justify-center gap-3.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-white/70">
      Then
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label="Then and now"
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-40 w-10 cursor-pointer accent-white [writing-mode:vertical-lr]"
      />
      Now
    </label>
  );
}

export function Sheet({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  const motionEnabled = useMotionEnabled();
  return (
    <motion.section
      drag={motionEnabled ? "y" : false}
      dragConstraints={{ top: tall ? -280 : 0, bottom: tall ? 0 : 220 }}
      dragElastic={0.12}
      transition={spring}
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 rounded-t-[32px] bg-surface px-6 pb-[34px] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] ${tall ? "top-24" : "h-[280px]"}`}
    >
      <div className="h-1 w-9 rounded-pill bg-text-3" />
      <div className="flex w-full flex-1 flex-col gap-4 overflow-auto">{children}</div>
    </motion.section>
  );
}
