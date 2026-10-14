import { survivalText, type SurvivalElement } from "@/lib/studio/records";

export function MapCard({
  title = "Plan · condition",
  pins,
}: {
  title?: string;
  pins: SurvivalElement[];
}) {
  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-card bg-[#f4f1ea] p-5 text-[#2a2a28] shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em]">{title}</p>
      </div>
      <div
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
      </div>
    </div>
  );
}
