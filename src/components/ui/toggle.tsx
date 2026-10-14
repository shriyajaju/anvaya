"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";

export function Toggle({
  state = false,
  onStateChange,
  label,
}: {
  state?: boolean;
  onStateChange?: (next: boolean) => void;
  label: string;
}) {
  const motionEnabled = useMotionEnabled();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={state}
      aria-label={label}
      onClick={() => onStateChange?.(!state)}
      className={`${focusRing} relative h-6 w-11 rounded-pill ${state ? "bg-primary" : "bg-surface-2"}`}
    >
      <motion.span
        aria-hidden
        className="absolute top-0.5 size-5 rounded-full bg-surface shadow-card"
        animate={{ x: state ? 22 : 2 }}
        transition={motionEnabled ? spring : { duration: 0 }}
      />
    </button>
  );
}
