export type ReconstructionMode = "image" | "3d";

/** Safe for client and server. Secrets live in config.ts / provider.ts only. */
export function reconstructionMode(): ReconstructionMode {
  const value = process.env.NEXT_PUBLIC_RECONSTRUCTION_MODE ?? process.env.RECONSTRUCTION_MODE ?? "image";
  return value === "3d" ? "3d" : "image";
}

export function isImageReconstruction() {
  return reconstructionMode() !== "3d";
}
