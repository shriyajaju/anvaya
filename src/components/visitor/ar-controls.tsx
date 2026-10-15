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
  onUnsupported,
}: {
  src: string;
  usdz?: string | null;
  opacity: number;
  label: string;
  onUnsupported?: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = holder.current;
    if (!parent) return;
    let cancelled = false;
    void import("@google/model-viewer")
      .then(() => customElements.whenDefined("model-viewer"))
      .then(() => {
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
    })
      .catch(() => onUnsupported?.());
    return () => {
      cancelled = true;
    };
  }, [label, onUnsupported, src, usdz]);
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

export function Sheet({ children, tall = false, onEscape }: { children: React.ReactNode; tall?: boolean; onEscape?: () => void }) {
  const motionEnabled = useMotionEnabled();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!tall) return;
    const node = ref.current;
    if (!node) return;
    const items = () => [...node.querySelectorAll<HTMLElement>("a, button, input, textarea, select")].filter((item) => !item.hasAttribute("disabled"));
    items()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") (onEscape ?? (() => window.history.back()))();
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEscape, tall]);
  return (
    <motion.section
      ref={ref}
      role={tall ? "dialog" : "region"}
      aria-modal={tall ? true : undefined}
      aria-label="Details"
      drag={motionEnabled ? "y" : false}
      dragConstraints={{ top: tall ? -280 : 0, bottom: tall ? 0 : 220 }}
      dragElastic={0.12}
      transition={motionEnabled ? spring : { duration: 0.15 }}
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 rounded-t-[32px] bg-surface px-6 pb-[34px] pt-3 shadow-float ${tall ? "top-24" : "h-[280px]"}`}
    >
      <div className="h-1 w-9 rounded-pill bg-text-3" />
      <div className="flex w-full flex-1 flex-col gap-4 overflow-auto">{children}</div>
    </motion.section>
  );
}
