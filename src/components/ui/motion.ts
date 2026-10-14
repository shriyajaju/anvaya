"use client";

import { useReducedMotion } from "framer-motion";

export const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

export function useMotionEnabled() {
  return useReducedMotion() !== true;
}

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
