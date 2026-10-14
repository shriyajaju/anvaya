"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type PillState = "Default" | "Selected";
export type PillSize = "Default" | "XS";

export function Pill({
  label,
  state = "Default",
  size = "Default",
  icon,
  count,
  countValue,
  chevron = false,
  switcher = false,
  className = "",
  onClick,
}: {
  label: string;
  state?: PillState;
  size?: PillSize;
  icon?: ReactNode;
  count?: boolean;
  countValue?: string;
  chevron?: boolean;
  switcher?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const motionEnabled = useMotionEnabled();
  const selected = state === "Selected";
  const height = switcher ? "h-10 px-4 text-[15px]" : size === "XS" ? "h-6 px-2.5 text-[11px]" : "h-9 px-4 text-[15px]";
  return (
    <motion.button
      type="button"
      whileTap={motionEnabled ? { scale: 0.98 } : undefined}
      transition={spring}
      onClick={onClick}
      className={`${focusRing} inline-flex items-center gap-2 rounded-pill font-medium leading-6 ${height} ${
        selected ? "bg-primary text-on-primary" : "bg-surface-2 text-text-2"
      } ${switcher ? "shadow-card" : ""} ${className}`}
    >
      {icon}
      <span>{label}</span>
      {count ? <span className="opacity-60">{countValue}</span> : null}
      {chevron || switcher ? <ChevronDown aria-hidden className="size-4" /> : null}
    </motion.button>
  );
}
