import type { ReactNode } from "react";
import type { ConfidenceLevel } from "@/components/ui/chip";

export type RowDot = ConfidenceLevel | "Review" | "Accent" | "None";

const dotClass: Record<Exclude<RowDot, "None">, string> = {
  High: "bg-conf-high",
  Medium: "bg-conf-medium",
  Low: "bg-conf-low",
  Review: "bg-review",
  Accent: "bg-accent",
};

export function Row({
  title = "Row title",
  meta = "Supporting information",
  dot = "None",
  divider = true,
  leading,
  trailing,
  className = "",
}: {
  title?: string;
  meta?: string;
  dot?: RowDot;
  divider?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative flex min-h-12 items-center gap-3 py-3 ${className}`}>
      {dot !== "None" ? <span aria-hidden className={`size-2 shrink-0 rounded-full ${dotClass[dot]}`} /> : null}
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-6 text-text-1">{title}</span>
        {meta ? <span className="block text-[13px] leading-5 text-text-2">{meta}</span> : null}
      </span>
      {trailing}
      {divider ? <span className="absolute inset-x-0 bottom-0 h-px bg-border" /> : null}
    </div>
  );
}
