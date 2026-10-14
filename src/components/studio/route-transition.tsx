"use client";

import { spring, useMotionEnabled } from "@/components/ui/motion";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const motionEnabled = useMotionEnabled();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={motionEnabled ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={motionEnabled ? { opacity: 0, y: 8 } : undefined}
        transition={motionEnabled ? spring : { duration: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
