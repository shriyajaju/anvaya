export type ConfidenceProportion = "3:1:1" | "7:3:2" | "1:1:1" | "2:1:2";

const parts: Record<ConfidenceProportion, [number, number, number]> = {
  "3:1:1": [3, 1, 1],
  "7:3:2": [7, 3, 2],
  "1:1:1": [1, 1, 1],
  "2:1:2": [2, 1, 2],
};

export function ConfidenceBar({
  proportion = "3:1:1",
  legend = true,
  className = "",
}: {
  proportion?: ConfidenceProportion;
  legend?: boolean;
  className?: string;
}) {
  const [high, medium, low] = parts[proportion];
  const total = high + medium + low;
  return (
    <div className={`w-60 ${className}`}>
      <div className="flex h-2 overflow-hidden rounded-bar" role="img" aria-label={`Confidence ${proportion}`}>
        <span className="bg-conf-high" style={{ width: `${(high / total) * 100}%` }} />
        <span className="bg-conf-medium" style={{ width: `${(medium / total) * 100}%` }} />
        <span className="bg-conf-low" style={{ width: `${(low / total) * 100}%` }} />
      </div>
      {legend ? (
        <p className="mt-2 text-[13px] leading-5 text-text-2">
          {high} High · {medium} Medium · {low} Low
        </p>
      ) : null}
    </div>
  );
}

export function ProgressBar({ percent = 0, className = "" }: { percent?: number; className?: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`h-1 w-60 overflow-hidden rounded-bar bg-surface-2 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}
