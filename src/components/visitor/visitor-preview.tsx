export function VisitorPreview({
  name,
  location,
  description,
  preview,
  framed = false,
  stats,
}: {
  name: string;
  location: string | null;
  description?: string | null;
  preview: boolean;
  framed?: boolean;
  stats?: { elements: number; sources: number; stories: number };
}) {
  return (
    <div className={`relative flex flex-col px-6 pb-8 pt-10 text-text-1 ${framed ? "h-full bg-[linear-gradient(180deg,var(--color-camera-from),var(--color-page)_62%)]" : "min-h-screen bg-page"}`}>
      {preview ? (
        <p className="absolute right-4 top-4 rounded-pill bg-surface/80 px-2.5 py-1 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-1 shadow-card backdrop-blur-[16px]">
          Preview
        </p>
      ) : null}
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">Anvaya</p>
      {location ? (
        <p className="mt-10 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">
          {name} · {location}
        </p>
      ) : null}
      <h1 className="mt-3 font-visitor text-[40px] font-normal leading-[48px]">{name}</h1>
      {description ? <p className="mt-3 text-[15px] leading-6 text-text-2">{description}</p> : null}
      {stats ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">
            {stats.elements} reconstructions
          </span>
          <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">
            {stats.stories} stories
          </span>
          <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2">
            {stats.sources} sources
          </span>
        </div>
      ) : null}
    </div>
  );
}
