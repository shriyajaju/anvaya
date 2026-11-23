"use client";

import { focusRing } from "@/components/ui/motion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useEffect, useState, type ReactNode } from "react";

export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return children;
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align="center"
            sideOffset={8}
            avoidCollisions={false}
            className="z-[80] rounded-button bg-primary px-2.5 py-1.5 text-[13px] leading-5 text-on-primary shadow-float"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function TooltipExample() {
  return (
    <Tooltip label="Confidence is always visible">
      <button type="button" className={`${focusRing} h-9 rounded-button border border-border px-3 text-[13px] text-text-1`}>
        Hover
      </button>
    </Tooltip>
  );
}
