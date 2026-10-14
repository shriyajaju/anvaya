"use client";

import { survivalText, type SurvivalElement } from "@/lib/studio/records";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type PlanPlace = { id: string; name: string; planX: number; planY: number };
export type PlanMarker = { id: string; n: number; planX: number; planY: number; label: string };

export function MapCard({
  title = "Plan · condition",
  pins = [],
  places = [],
  markers = [],
  onMarkerDrop,
}: {
  title?: string;
  pins?: SurvivalElement[];
  places?: PlanPlace[];
  markers?: PlanMarker[];
  onMarkerDrop?: (id: string, planX: number, planY: number) => void;
}) {
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  function point(event: ReactPointerEvent) {
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, (x * 100 - 8) / 84)),
      y: Math.min(1, Math.max(0, (y * 100 - 8) / 84)),
    };
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-card bg-[#f4f1ea] p-5 text-[#2a2a28] shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em]">{title}</p>
      </div>
      <div
        ref={board}
        className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-card border border-[#e2ded4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(42,42,40,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(42,42,40,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-6 h-[calc(100%-48px)] w-[calc(100%-48px)]" aria-hidden>
          <rect x="18" y="16" width="64" height="62" fill="none" stroke="#2a2a28" strokeWidth="0.6" />
          <path d="M18 16 Q50 4 82 16" fill="none" stroke="#2a2a28" strokeWidth="0.6" />
          <line x1="50" y1="16" x2="50" y2="78" stroke="#2a2a28" strokeDasharray="1.2 1.2" strokeWidth="0.4" />
        </svg>
        {pins.map((pin) =>
          pin.planX === null || pin.planY === null ? null : (
            <span
              key={pin.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${8 + pin.planX * 84}%`, top: `${8 + pin.planY * 84}%` }}
            >
              <span
                className={`size-3 rounded-full border-2 border-white ${pin.score <= 2 ? "bg-conf-medium" : "bg-[#111]"}`}
              />
              <span className="mt-1 max-w-24 truncate rounded-pill bg-white/90 px-2 py-0.5 text-[10px] leading-4">
                {pin.name}
                <span className="text-[#6b6b6b]"> · {survivalText(pin.score)}</span>
              </span>
            </span>
          ),
        )}
        {places.map((place) => (
          <span
            key={place.id}
            className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#2a2a28]/40"
            style={{ left: `${8 + place.planX * 84}%`, top: `${8 + place.planY * 84}%` }}
          />
        ))}
        {markers.map((marker) => {
          const live = drag?.id === marker.id ? drag : null;
          const x = live?.x ?? marker.planX;
          const y = live?.y ?? marker.planY;
          return (
            <button
              key={marker.id}
              type="button"
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${8 + x * 84}%`, top: `${8 + y * 84}%` }}
              aria-label={`${marker.n}. ${marker.label}`}
              onPointerDown={(event) => {
                if (!onMarkerDrop) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const next = point(event);
                setDrag({ id: marker.id, ...next });
              }}
              onPointerMove={(event) => {
                if (drag?.id !== marker.id) return;
                const next = point(event);
                setDrag({ id: marker.id, ...next });
              }}
              onPointerUp={(event) => {
                if (drag?.id !== marker.id || !onMarkerDrop) return;
                const next = point(event);
                setDrag(null);
                onMarkerDrop(marker.id, next.x, next.y);
              }}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-[#111] text-[11px] font-medium text-white">
                {marker.n}
              </span>
              <span className="mt-1 max-w-28 truncate rounded-pill bg-white/90 px-2 py-0.5 text-[10px] leading-4">
                {marker.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
