import "server-only";

import { reconstructionConfig } from "@/lib/reconstruction/config";

export type GenerateInput = {
  photo: Buffer;
  photoMime: string;
  prompt: string;
};

export type GenerateResult = {
  bytes: Buffer;
  mime: string;
  provider: string;
  model: string;
};

/**
 * Single entry for image reconstruction providers.
 * Default: Cloudflare Workers AI REST — @cf/black-forest-labs/flux-2-klein-4b
 * (multipart/form-data: prompt, input_image_0…3, width, height, guidance, seed).
 * Stub: OpenAI Images Edits — gpt-image-2.5-sunburst (POST /v1/images/edits).
 */
export async function generateReconstruction(input: GenerateInput): Promise<GenerateResult> {
  const provider = reconstructionConfig.provider;
  if (provider === "mock" || process.env.RECONSTRUCTION_MOCK === "1") {
    return mockGenerate(input);
  }
  if (provider === "openai") {
    return openaiEdit(input);
  }
  return cloudflareFlux(input);
}

/**
 * Cloudflare Workers AI — flux-2-klein-4b
 * Docs: multipart form with required `prompt`; optional `input_image_0`–`input_image_3`
 * (binary, each must be smaller than 512×512), `width` (256–1920, default 1024),
 * `height` (256–1920, default 768), `guidance`, `seed`. Steps fixed at 4.
 * Response: `{ result: { image: "<base64>" } }`.
 */
async function cloudflareFlux(input: GenerateInput): Promise<GenerateResult> {
  const { accountId, apiToken, model } = reconstructionConfig.cloudflare;
  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for generation.");
  }

  const form = new FormData();
  form.append("prompt", input.prompt);
  form.append("width", "1024");
  form.append("height", "768");
  // Reference photo as input_image_0 (must be < 512×512 per CF docs — caller should resize).
  const blob = new Blob([new Uint8Array(input.photo)], { type: input.photoMime || "image/jpeg" });
  form.append("input_image_0", blob, "source.jpg");

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare Workers AI failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("image/")) {
    const bytes = Buffer.from(await response.arrayBuffer());
    return { bytes, mime: contentType.split(";")[0] || "image/jpeg", provider: "cloudflare", model };
  }

  const json = (await response.json()) as {
    result?: { image?: string };
    image?: string;
    success?: boolean;
    errors?: { message?: string }[];
  };
  const b64 = json.result?.image ?? json.image;
  if (!b64) {
    const message = json.errors?.[0]?.message ?? "No image in Cloudflare response.";
    throw new Error(message);
  }
  return {
    bytes: Buffer.from(b64, "base64"),
    mime: "image/jpeg",
    provider: "cloudflare",
    model,
  };
}

/**
 * OpenAI Images Edits stub — switch reconstructionConfig.provider to "openai".
 * Docs: POST https://api.openai.com/v1/images/edits
 * multipart: model, image[] (file), prompt; response data[0].b64_json.
 */
async function openaiEdit(input: GenerateInput): Promise<GenerateResult> {
  const { apiKey, model } = reconstructionConfig.openai;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for the OpenAI provider.");

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", input.prompt);
  form.append("image[]", new Blob([new Uint8Array(input.photo)], { type: input.photoMime || "image/png" }), "source.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI images/edits failed (${response.status}): ${text.slice(0, 400)}`);
  }

  const json = (await response.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI images/edits returned no image.");
  return { bytes: Buffer.from(b64, "base64"), mime: "image/png", provider: "openai", model };
}

/** Deterministic PNG for e2e / local without API keys. */
async function mockGenerate(input: GenerateInput): Promise<GenerateResult> {
  // Minimal 1×1 white PNG if we cannot composite; prefer returning the source photo untouched.
  const bytes = input.photo.length > 0 ? input.photo : Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  return {
    bytes,
    mime: input.photoMime || "image/png",
    provider: "mock",
    model: "mock-reconstruction",
  };
}
