export function VisitorPreview({
  name,
  location,
  preview,
  framed = false,
}: {
  name: string;
  location: string | null;
  preview: boolean;
  framed?: boolean;
}) {
  return (
    <div className={`relative flex flex-col bg-page px-6 pb-8 pt-10 text-text-1 ${framed ? "h-full" : "min-h-screen"}`}>
      {preview ? (
        <p className="absolute right-4 top-4 rounded-pill bg-surface/80 px-2.5 py-1 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-1 shadow-card backdrop-blur-[16px]">
          Preview
        </p>
      ) : null}
      <p className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-text-3">Anvaya</p>
      <h1 className="mt-8 font-visitor text-[40px] font-normal leading-[48px]">{name}</h1>
      {location ? <p className="mt-3 text-[15px] leading-6 text-text-2">{location}</p> : null}
    </div>
  );
}
