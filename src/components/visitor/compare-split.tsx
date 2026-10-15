"use client";

import { ModelViewerAR } from "@/components/visitor/ar-controls";
import { useState } from "react";

export function CompareSplit({ thenSrc, nowSrc, label }: { thenSrc: string | null; nowSrc: string | null; label: string }) {
  const [split, setSplit] = useState(50);
  return (
    <div className="relative h-[420px] overflow-hidden rounded-card bg-black">
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        {thenSrc ? <ModelViewerAR src={thenSrc} opacity={1} label={`${label} then`} /> : null}
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        {nowSrc ? <ModelViewerAR src={nowSrc} opacity={1} label={`${label} now`} /> : null}
      </div>
      <input
        type="range"
        min={15}
        max={85}
        value={split}
        aria-label="Compare then and now"
        onChange={(event) => setSplit(Number(event.target.value))}
        className="absolute inset-x-6 bottom-4"
      />
    </div>
  );
}
