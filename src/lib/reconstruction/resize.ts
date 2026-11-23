/**
 * Cloudflare flux-2-klein-4b requires each input_image_* to be smaller than 512×512.
 * If the buffer is already small enough we leave it; otherwise we note the limit.
 * Without a native image decoder we pass through and rely on CF to reject oversized
 * inputs — the API route records the error. Optional sharp can be added later.
 */
export const CLOUDFLARE_MAX_INPUT = 512;

export function noteResizeNeeded(_bytes: Buffer, width?: number | null, height?: number | null) {
  if (width && height && (width >= CLOUDFLARE_MAX_INPUT || height >= CLOUDFLARE_MAX_INPUT)) {
    return `Source photo is ${width}×${height}. Cloudflare requires each input_image under 512×512 — resize before generate, or use the OpenAI provider.`;
  }
  return null;
}
