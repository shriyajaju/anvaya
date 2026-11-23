import "server-only";

import { reconstructionMode, type ReconstructionMode } from "@/lib/reconstruction/mode";

export type { ReconstructionMode };
export type ReconstructionProviderId = "cloudflare" | "openai" | "mock";

export const reconstructionConfig = {
  mode: reconstructionMode(),
  /** Switch provider by changing this value (or RECONSTRUCTION_PROVIDER env). */
  provider: (process.env.RECONSTRUCTION_PROVIDER ?? "cloudflare") as ReconstructionProviderId,
  cloudflare: {
    model: "@cf/black-forest-labs/flux-2-klein-4b",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  },
  openai: {
    /** Stub target — switch provider to "openai" when ready. */
    model: "gpt-image-2.5-sunburst",
    apiKey: process.env.OPENAI_API_KEY ?? "",
  },
};

export { isImageReconstruction } from "@/lib/reconstruction/mode";
