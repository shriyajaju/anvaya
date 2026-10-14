"use client";

import { useWorkspace } from "@/components/studio/workspace-context";
import { ChipConfidence } from "@/components/ui/chip";
import { era, yearLabel } from "@/lib/studio/records";

export function TimelineCanvas() {
  const { timeline, selectedEventId, setSelectedEventId } = useWorkspace();
  const years = [
    ...timeline.periods.flatMap((period) => [period.yearFrom, period.yearTo]),
    ...timeline.events.map((event) => event.year),
    timeline.reconstructionYear,
    new Date().getFullYear(),
  ].filter((year): year is number => year !== null);
  const min = Math.min(...years, 0);
  const max = Math.max(...years, min + 1);
  const span = Math.max(1, max - min);
  const xOf = (year: number) => 8 + ((year - min) / span) * 84;

  const ticks = Array.from(new Set([min, ...timeline.events.map((event) => event.year).filter((year): year is number => year !== null), max])).sort(
    (a, b) => a - b,
  );

  return (
    <div className="relative h-full min-h-[640px] overflow-hidden rounded-[20px] border border-border bg-surface shadow-card">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" role="img" aria-label="Site timeline">
        {timeline.periods.map((period, index) => {
          const from = period.yearFrom ?? min;
          const to = period.yearTo ?? from;
          const x = xOf(Math.min(from, to));
          const width = Math.max(6, xOf(Math.max(from, to)) - x);
          return <rect key={period.id} x={x} y="12" width={width} height="72" rx="1.2" fill={`rgba(17,17,17,${0.04 + index * 0.03})`} />;
        })}
        <line x1="8" x2="92" y1="38" y2="38" stroke="var(--color-border)" strokeWidth="0.15" />
        <line x1="8" x2="92" y1="58" y2="58" stroke="var(--color-border)" strokeWidth="0.15" />
        {timeline.reconstructionYear !== null ? (
          <line
            x1={xOf(timeline.reconstructionYear)}
            x2={xOf(timeline.reconstructionYear)}
            y1="14"
            y2="84"
            stroke="var(--color-text-1)"
            strokeDasharray="0.8 0.6"
            strokeWidth="0.25"
          />
        ) : null}
        <line x1="8" x2="92" y1="86" y2="86" stroke="var(--color-border)" strokeWidth="0.2" />
        {ticks.map((year) => (
          <text key={year} x={xOf(year)} y="92" textAnchor="middle" fontSize="2.2" fill="var(--color-text-3)">
            {year === max ? "Today" : era(year)}
          </text>
        ))}
      </svg>
      {timeline.reconstructionYear !== null ? (
        <p
          className="absolute top-3 -translate-x-1/2 rounded-button bg-surface px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em]"
          style={{ left: `${xOf(timeline.reconstructionYear)}%` }}
        >
          Reconstruction period · {era(timeline.reconstructionYear)}
        </p>
      ) : null}
      {timeline.events.map((event, index) => {
        if (event.year === null) return null;
        const selected = event.id === selectedEventId;
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => setSelectedEventId(event.id)}
            className="absolute flex w-28 -translate-x-1/2 flex-col items-center"
            style={{ left: `${xOf(event.year)}%`, top: index % 2 === 0 ? "30%" : "50%" }}
          >
            <span className={`size-4 rounded-full border-2 border-surface ${selected ? "bg-text-1" : "bg-surface-2"}`} />
            <span className={`mt-1 text-center text-[10px] leading-4 ${selected ? "font-medium" : ""}`}>{event.title}</span>
          </button>
        );
      })}
      {timeline.events
        .filter((event) => event.id === selectedEventId)
        .map((event) => (
          <div key={event.id} className="absolute left-[18%] top-[16%] w-[260px] rounded-card bg-surface p-3.5 shadow-float">
            <p className="text-[13px] font-medium leading-5">{event.title}</p>
            <p className="mt-1 text-[10px] leading-4 text-text-2">{yearLabel(event.year, event.approx)}</p>
            <div className="mt-2">
              <ChipConfidence level={event.elementIds.length ? "Medium" : "Low"} />
            </div>
          </div>
        ))}
    </div>
  );
}

