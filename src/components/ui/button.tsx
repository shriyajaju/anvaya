"use client";

import { focusRing, spring, useMotionEnabled } from "@/components/ui/motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type ButtonType = "Primary" | "Secondary" | "Ghost";
export type ButtonSize = "Large" | "Small";
export type ButtonState = "Default" | "Hover" | "Disabled";

type SharedButton = {
  type?: ButtonType;
  size?: ButtonSize;
  state?: ButtonState;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

type ButtonProps =
  | (SharedButton & { iconOnly?: false; label?: string; "aria-label"?: string })
  | (SharedButton & { iconOnly: true; "aria-label": string; label?: never });

const sizeClass: Record<ButtonSize, string> = {
  Large: "h-12 gap-2 px-5",
  Small: "h-9 gap-2 px-3.5",
};

export function Button({
  type = "Primary",
  size = "Large",
  state = "Default",
  label = "Button label",
  iconLeft,
  iconRight,
  iconOnly = false,
  className = "",
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const motionEnabled = useMotionEnabled();
  const isDisabled = disabled || state === "Disabled";
  const hovered = state === "Hover";
  const box = iconOnly ? (size === "Small" ? "size-9" : "size-12") : sizeClass[size];

  return (
    <motion.button
      type="button"
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={motionEnabled && !isDisabled ? { scale: 0.98 } : undefined}
      transition={spring}
      className={`${focusRing} inline-flex items-center justify-center rounded-button font-medium disabled:pointer-events-none disabled:opacity-40 ${
        type === "Ghost"
          ? `h-5 bg-transparent px-0 text-[13px] normal-case leading-5 tracking-normal text-accent ${hovered ? "opacity-80" : ""}`
          : `${box} text-[11px] uppercase leading-4 tracking-[0.08em] ${
              type === "Primary"
                ? "bg-primary text-on-primary"
                : `bg-surface text-text-1 shadow-card ${hovered ? "bg-surface-2" : "hover:bg-surface-2"}`
            }`
      } ${className}`}
    >
      {iconLeft}
      {iconOnly ? null : label}
      {iconRight}
    </motion.button>
  );
}
