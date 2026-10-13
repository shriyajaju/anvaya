import { describe, expect, it } from "vitest";
import { publicEnvSchema } from "./env";

describe("publicEnvSchema", () => {
  it("accepts the documented public environment", () => {
    const parsed = publicEnvSchema.safeParse({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_STUDIO_URL: "http://localhost:3000",
      NEXT_PUBLIC_VISITOR_URL: "http://localhost:3000",
    });
    expect(parsed.success).toBe(true);
  });
});
