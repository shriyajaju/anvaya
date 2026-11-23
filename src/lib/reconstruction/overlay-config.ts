export type OverlayBlend = "opacity" | "screen";

/** Client-safe. Default opacity; set NEXT_PUBLIC_OVERLAY_BLEND=screen for wireframe blend. */
export function overlayBlend(): OverlayBlend {
  const value = process.env.NEXT_PUBLIC_OVERLAY_BLEND ?? process.env.OVERLAY_BLEND ?? "opacity";
  return value === "screen" ? "screen" : "opacity";
}
