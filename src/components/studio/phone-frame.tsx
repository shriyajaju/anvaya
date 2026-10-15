"use client";

import { spring, useMotionEnabled } from "@/components/ui/motion";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PhoneFrame({
  revision,
  theme,
  children,
}: {
  revision: string;
  theme: "light" | "dark";
  children: ReactNode;
}) {
  const motionEnabled = useMotionEnabled();
  const [scale, setScale] = useState(0.55);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const node = document.getElementById("phone-scale-slot");
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      setScale(Math.min(box.width / 390, box.height / 844));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (seen.current === null) {
      seen.current = revision;
      return;
    }
    if (seen.current === revision) return;
    seen.current = revision;
    setToast(true);
    const timer = window.setTimeout(() => setToast(false), 1600);
    return () => window.clearTimeout(timer);
  }, [revision]);

  return (
    <div id="phone-scale-slot" className="relative h-full w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="origin-center overflow-hidden rounded-phone border border-[color-mix(in_srgb,var(--color-glass-border)_40%,transparent)] bg-[var(--color-phone)] shadow-phone"
          style={{ width: 390, height: 844, transform: `scale(${scale})` }}
        >
          <div data-theme={theme} data-phone-frame="" className="h-full w-full bg-page text-text-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${revision}-${theme}`}
                className="h-full"
                initial={motionEnabled ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                exit={motionEnabled ? { opacity: 0 } : undefined}
                transition={motionEnabled ? spring : { duration: 0 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {toast ? (
          <motion.p
            role="status"
            initial={motionEnabled ? { y: 16, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={motionEnabled ? { y: 16, opacity: 0 } : undefined}
            transition={spring}
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-pill bg-[color-mix(in_srgb,var(--color-glass-url)_88%,transparent)] px-4 py-2 text-[13px] leading-5 text-[color:var(--color-glass-url-text)] shadow-float backdrop-blur-[16px]"
          >
            Updated
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
