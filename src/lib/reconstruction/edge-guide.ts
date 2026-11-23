import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Generate a white-on-transparent edge outline from a source photo.
 * Stored under public/seed-reconstructions/... or public/generated/edge-guides/.
 */
export async function generateEdgeGuide(input: {
  sourceBytes: Buffer;
  siteId: string;
  assetId: string;
}): Promise<{ relativeUrl: string; bytes: Buffer }> {
  const edges = await sharp(input.sourceBytes)
    .rotate()
    .resize({ width: 1024, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    })
    .threshold(28)
    .png()
    .toBuffer();

  // Keep only light edges on transparent background.
  const { data, info } = await sharp(edges).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const luminance = data[i];
    if (luminance < 40) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 220;
    }
  }
  const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();

  const dir = path.join(process.cwd(), "public", "generated", "edge-guides", input.siteId);
  await mkdir(dir, { recursive: true });
  const filename = `${input.assetId}.png`;
  await writeFile(path.join(dir, filename), bytes);
  return { relativeUrl: `/generated/edge-guides/${input.siteId}/${filename}`, bytes };
}
