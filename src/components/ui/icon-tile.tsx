import type { ReactNode } from "react";

export function IconTile({
  size = "40",
  children,
  className = "",
}: {
  size?: "40" | "32";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-icon-tile bg-surface-2 text-text-2 ${
        size === "40" ? "size-10" : "size-8"
      } ${className}`}
    >
      {children}
    </span>
  );
}
