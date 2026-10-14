"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";

export type SegmentedState = "Default" | "Selected" | "Selected-High" | "Selected-Medium" | "Selected-Low";

const selectedClass: Record<Exclude<SegmentedState, "Default">, string> = {
  Selected: "bg-primary text-on-primary",
  "Selected-High": "bg-conf-high-bg text-conf-high",
  "Selected-Medium": "bg-conf-medium-bg text-conf-medium",
  "Selected-Low": "bg-conf-low-bg text-conf-low",
};

export function Segmented({
  items,
  value,
  onValueChange,
  layoutId = "segmented",
}: {
  items: { value: string; label: string; tone?: Exclude<SegmentedState, "Default"> }[];
  value: string;
  onValueChange?: (value: string) => void;
  layoutId?: string;
}) {
  const motionEnabled = useMotionEnabled();
  return (
    <div className="inline-flex gap-1.5" role="radiogroup">
      {items.map((item) => {
        const selected = item.value === value;
        const tone = item.tone ?? "Selected";
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onValueChange?.(item.value)}
            className={`${focusRing} relative h-9 rounded-pill px-3.5 text-[13px] font-medium leading-5 text-text-2`}
          >
            {selected ? (
              <motion.span
                layoutId={motionEnabled ? layoutId : undefined}
                className={`absolute inset-0 rounded-pill ${selectedClass[tone]}`}
                transition={motionEnabled ? spring : { duration: 0 }}
              />
            ) : (
              <span className="absolute inset-0 rounded-pill bg-surface-2" />
            )}
            <span className={`relative ${selected ? selectedClass[tone].split(" ").find((c) => c.startsWith("text-")) : ""}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
