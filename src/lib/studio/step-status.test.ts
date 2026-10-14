import { describe, expect, it } from "vitest";
import { signPreviewToken, verifyPreviewToken } from "@/lib/preview-token";
import { stepStatus, type StepSignals } from "@/lib/studio/steps";

const empty: StepSignals = {
  hasIdentity: false,
  hasCondition: false,
  evidenceCount: 0,
  timelineCount: 0,
  elementCount: 0,
  storyCount: 0,
  reviewApproved: false,
  published: false,
  versionCount: 0,
};

describe("stepStatus", () => {
  it("marks a step complete only when its signal is present", () => {
    expect(stepStatus(empty).overview).toBe(false);
    expect(stepStatus({ ...empty, hasIdentity: true, evidenceCount: 2 }).evidence).toBe(true);
    expect(stepStatus({ ...empty, published: true, versionCount: 1 }).archive).toBe(true);
    expect(stepStatus({ ...empty, published: true }).publish).toBe(true);
  });
});

describe("preview token", () => {
  it("round-trips for the same site and rejects another", () => {
    const token = signPreviewToken({ slug: "kanheri", siteId: "site-1" }, 1_000);
    expect(verifyPreviewToken(token, { slug: "kanheri", siteId: "site-1" }, 1_000)).toBe(true);
    expect(verifyPreviewToken(token, { slug: "other", siteId: "site-1" }, 1_000)).toBe(false);
    expect(verifyPreviewToken(token, { slug: "kanheri", siteId: "site-1" }, 1_000 + 31 * 60 * 1000)).toBe(
      false,
    );
  });
});
