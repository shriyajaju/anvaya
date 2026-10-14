"use client";

import { spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type CardPadding = "Default" | "Tight" | "None";

const padding: Record<CardPadding, string> = {
  Default: "p-5",
  Tight: "p-3",
  None: "p-0",
};

export function Card({
  padding: pad = "Default",
  sectionLabel,
  children,
  className = "",
}: {
  padding?: CardPadding;
  sectionLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  const motionEnabled = useMotionEnabled();
  return (
    <motion.section
      whileHover={motionEnabled ? { y: -4 } : undefined}
      transition={spring}
      className={`rounded-card bg-surface text-text-1 shadow-card ${padding[pad]} ${className}`}
    >
      {sectionLabel ? (
        <p className="mb-3 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">{sectionLabel}</p>
      ) : null}
      {children}
    </motion.section>
  );
}
