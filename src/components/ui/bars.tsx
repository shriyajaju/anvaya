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
  counts,
  className = "",
}: {
  proportion?: ConfidenceProportion;
  legend?: boolean;
  counts?: { high: number; medium: number; low: number };
  className?: string;
}) {
  const [presetHigh, presetMedium, presetLow] = parts[proportion];
  const high = counts?.high ?? presetHigh;
  const medium = counts?.medium ?? presetMedium;
  const low = counts?.low ?? presetLow;
  const sum = high + medium + low;
  const width = className.includes("w-") ? "" : "w-60";
  return (
    <div className={`${width} ${className}`}>
      <div className="flex h-2 overflow-hidden rounded-bar bg-surface-2" role="img" aria-label={`Confidence ${proportion}`}>
        {sum > 0 ? (
          <>
            <span className="bg-conf-high" style={{ width: `${(high / sum) * 100}%` }} />
            <span className="bg-conf-medium" style={{ width: `${(medium / sum) * 100}%` }} />
            <span className="bg-conf-low" style={{ width: `${(low / sum) * 100}%` }} />
          </>
        ) : null}
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
  const width = className.includes("w-") ? "" : "w-60";
  return (
    <div
      className={`h-1 overflow-hidden rounded-bar bg-surface-2 ${width} ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}
