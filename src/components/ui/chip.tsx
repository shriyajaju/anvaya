export type ConfidenceLevel = "High" | "Medium" | "Low";
export type ChipAudience = "Studio" | "Visitor";

const studioLabel: Record<ConfidenceLevel, string> = {
  High: "High",
  Medium: "Medium",
  Low: "Low",
};

const visitorLabel: Record<ConfidenceLevel, string> = {
  High: "Well supported",
  Medium: "Likely",
  Low: "Uncertain",
};

const tone: Record<ConfidenceLevel, { text: string; bg: string; glass: string }> = {
  High: {
    text: "text-conf-high",
    bg: "bg-conf-high-bg",
    glass: "text-conf-high-glass border-conf-high-glass",
  },
  Medium: {
    text: "text-conf-medium",
    bg: "bg-conf-medium-bg",
    glass: "text-conf-medium-glass border-conf-medium-glass",
  },
  Low: {
    text: "text-conf-low",
    bg: "bg-conf-low-bg",
    glass: "text-conf-low-glass border-conf-low-glass",
  },
};

function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${className}`} />;
}

export function ChipConfidence({
  level = "High",
  audience = "Studio",
  glass = false,
  help = false,
  className = "",
}: {
  level?: ConfidenceLevel;
  audience?: ChipAudience;
  glass?: boolean;
  help?: boolean;
  className?: string;
}) {
  const label = audience === "Visitor" ? visitorLabel[level] : studioLabel[level];
  const colors = tone[level];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] ${
        glass
          ? `bg-[color-mix(in_srgb,var(--color-glass-camera)_55%,transparent)] backdrop-blur-[16px] ${colors.glass}`
          : `${colors.bg} ${colors.text}`
      } ${className}`}
    >
      <Dot className={glass ? "bg-current" : colors.text.replace("text-", "bg-")} />
      {label}
      {glass && help ? (
        <span
          className={`flex size-5 items-center justify-center rounded-full border text-[11px] ${colors.glass}`}
          aria-hidden
        >
          ?
        </span>
      ) : null}
    </span>
  );
}

export type StatusState = "Draft" | "In review" | "Published" | "Archived";

const statusTone: Record<StatusState, string> = {
  Draft: "bg-surface-2 text-text-2",
  "In review": "bg-review-bg text-review",
  Published: "bg-conf-high-bg text-conf-high",
  Archived: "bg-surface-2 text-text-3",
};

export function ChipStatus({
  state = "Draft",
  className = "",
}: {
  state?: StatusState;
  className?: string;
}) {
  const toneClass = statusTone[state];
  const dot = toneClass.includes("text-review")
    ? "bg-review"
    : toneClass.includes("text-conf-high")
      ? "bg-conf-high"
      : toneClass.includes("text-text-3")
        ? "bg-text-3"
        : "bg-text-2";
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] ${toneClass} ${className}`}
    >
      <Dot className={dot} />
      {state}
    </span>
  );
}

export function ChipNeutral({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-pill bg-surface-2 px-2.5 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-2 ${className}`}
    >
      {label}
    </span>
  );
}
