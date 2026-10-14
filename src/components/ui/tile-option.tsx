"use client";

import { IconTile } from "@/components/ui/icon-tile";
import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function TileOption({
  label,
  state = "Default",
  icon,
  onSelect,
}: {
  label: string;
  state?: "Default" | "Selected";
  icon: ReactNode;
  onSelect?: () => void;
}) {
  const motionEnabled = useMotionEnabled();
  const selected = state === "Selected";
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      whileTap={motionEnabled ? { scale: 0.98 } : undefined}
      transition={spring}
      className={`${focusRing} flex min-h-[140px] w-[180px] flex-col items-start gap-3 rounded-card border-2 bg-surface p-4 text-left shadow-card ${
        selected ? "border-text-1" : "border-border"
      }`}
    >
      <IconTile>{icon}</IconTile>
      <span className="text-[15px] font-medium leading-6 text-text-1">{label}</span>
    </motion.button>
  );
}
