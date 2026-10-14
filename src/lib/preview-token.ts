import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 30 * 60 * 1000;

type PreviewPayload = {
  slug: string;
  siteId: string;
  exp: number;
};

function secret() {
  const configured = process.env.PREVIEW_TOKEN_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PREVIEW_TOKEN_SECRET is required");
  }
  return "anvaya-dev-preview";
}

export function signPreviewToken(
  input: { slug: string; siteId: string },
  now = Date.now(),
) {
  const body = Buffer.from(
    JSON.stringify({ slug: input.slug, siteId: input.siteId, exp: now + TTL_MS } satisfies PreviewPayload),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPreviewToken(
  token: string,
  expected: { slug: string; siteId: string },
  now = Date.now(),
) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expectedSig = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expectedSig);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PreviewPayload;
    return parsed.slug === expected.slug && parsed.siteId === expected.siteId && parsed.exp > now;
  } catch {
    return false;
  }
}
