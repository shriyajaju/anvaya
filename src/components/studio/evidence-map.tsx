"use client";

import { useWorkspace } from "@/components/studio/workspace-context";
import Link from "next/link";

const pinColor = {
  high: "bg-conf-high",
  medium: "bg-conf-medium",
  low: "bg-conf-low",
};

const legend = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function EvidenceMap({ slug }: { slug: string }) {
  const { evidencePins, evidenceGroup, selectedPinId, setSelectedPinId } = useWorkspace();
  const placed = evidencePins.filter((pin) => pin.planX !== null && pin.planY !== null);
  const linked = evidencePins.filter((pin) => pin.sources > 0).length;
  const counts = {
    high: evidencePins.filter((pin) => pin.confidence === "high").length,
    medium: evidencePins.filter((pin) => pin.confidence === "medium").length,
    low: evidencePins.filter((pin) => pin.confidence === "low").length,
  };
  const selected = placed.find((pin) => pin.id === selectedPinId) ?? null;

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-card bg-[#f4f1ea] p-5 text-[#2a2a28] shadow-card">
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em]">
        {evidenceGroup} · element mapping
      </p>
      <div
        className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-card border border-[#e2ded4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(42,42,40,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,42,40,0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-6 h-[calc(100%-48px)] w-[calc(100%-48px)]" aria-hidden>
          <path d="M22 28 Q50 8 78 28" fill="none" stroke="#2a2a28" strokeWidth="0.7" />
          <path d="M22 28 V78 H78 V28" fill="none" stroke="#2a2a28" strokeWidth="0.7" />
          <rect x="34" y="36" width="32" height="28" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
        </svg>
        {placed.map((pin, index) => (
          <button
            key={pin.id}
            type="button"
            onClick={() => setSelectedPinId(pin.id === selectedPinId ? null : pin.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${10 + (pin.planX ?? 0) * 80}%`, top: `${10 + (pin.planY ?? 0) * 80}%` }}
            aria-label={`${pin.name}, ${legend[pin.confidence]}`}
          >
            <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-medium text-white ${pinColor[pin.confidence]}`}>
              {index + 1}
            </span>
          </button>
        ))}
        {selected?.planX != null && selected.planY != null ? (
          <p
            className="absolute -translate-x-1/2 rounded-pill bg-white px-2.5 py-1 text-[11px] shadow-card"
            style={{ left: `${10 + selected.planX * 80}%`, top: `calc(${10 + selected.planY * 80}% - 28px)` }}
          >
            {selected.name} · {selected.sources} source{selected.sources === 1 ? "" : "s"} · {legend[selected.confidence]}
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] leading-5">
        <p className="flex flex-wrap items-center gap-3">
          {(["high", "medium", "low"] as const).map((level) => (
            <span key={level} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${pinColor[level]}`} />
              {legend[level]} {counts[level]}
            </span>
          ))}
          <span className="text-[#6b6b6b]">
            {linked} of {evidencePins.length} elements have linked evidence
          </span>
        </p>
        <Link href={`/s/${slug}/reconstruct`} className="rounded-button bg-[#111] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
          Open in reconstruct
        </Link>
      </div>
    </div>
  );
}
