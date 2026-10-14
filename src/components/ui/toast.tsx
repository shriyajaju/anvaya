"use client";

import { spring, useMotionEnabled } from "@/components/ui/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export function Toast({ message, open }: { message: string; open: boolean }) {
  const motionEnabled = useMotionEnabled();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          initial={motionEnabled ? { y: 16, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={motionEnabled ? { y: 16, opacity: 0 } : undefined}
          transition={spring}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-primary px-4 py-2 text-[13px] leading-5 text-on-primary shadow-float"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ToastDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className="h-9 rounded-button bg-primary px-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-on-primary"
        onClick={() => {
          setOpen(true);
          window.setTimeout(() => setOpen(false), 1600);
        }}
      >
        Show toast
      </button>
      <Toast message="Saved" open={open} />
    </div>
  );
}
