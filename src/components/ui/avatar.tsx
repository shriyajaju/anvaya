export function Avatar({
  initials,
  size = "32",
  ring = false,
  className = "",
}: {
  initials: string;
  size?: "24" | "32" | "40";
  ring?: boolean;
  className?: string;
}) {
  const box = size === "24" ? "size-6 text-[9px]" : size === "40" ? "size-10 text-[13px]" : "size-8 text-[11px]";
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-surface-2 font-medium leading-5 text-text-2 ${box} ${
        ring ? "ring-2 ring-accent" : ""
      } ${className}`}
    >
      {initials}
    </span>
  );
}
