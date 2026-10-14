import { describe, expect, it } from "vitest";
import {
  canManageMembers,
  destinationAfterAuth,
  displayNameFromUser,
  initialsFromName,
  isStudioPath,
  slugify,
} from "./account";

describe("studio route protection", () => {
  it("protects studio paths and leaves visitor paths open", () => {
    expect(isStudioPath("/")).toBe(true);
    expect(isStudioPath("/settings/members")).toBe(true);
    expect(isStudioPath("/s/kanheri/overview")).toBe(true);
    expect(isStudioPath("/onboarding")).toBe(true);
    expect(isStudioPath("/login")).toBe(false);
    expect(isStudioPath("/auth/callback")).toBe(false);
    expect(isStudioPath("/kanheri")).toBe(false);
    expect(isStudioPath("/kanheri/ar/roof")).toBe(false);
  });
});

describe("first sign-in destination", () => {
  it("sends a person with no membership to create an organisation", () => {
    expect(destinationAfterAuth({ memberships: 0, next: "/settings/members" })).toBe(
      "/onboarding",
    );
  });

  it("returns to a studio path when a membership already exists", () => {
    expect(destinationAfterAuth({ memberships: 1, next: "/settings/members" })).toBe(
      "/settings/members",
    );
    expect(destinationAfterAuth({ memberships: 1, next: "/kanheri" })).toBe("/");
    expect(destinationAfterAuth({ memberships: 1, next: null })).toBe("/");
  });
});

describe("membership helpers", () => {
  it("limits member management to owners and admins", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("creator")).toBe(false);
    expect(canManageMembers("reviewer")).toBe(false);
    expect(canManageMembers(null)).toBe(false);
  });

  it("builds initials, slugs, and display names", () => {
    expect(initialsFromName("A. Iyer")).toBe("AI");
    expect(initialsFromName("Rao")).toBe("RA");
    expect(slugify("Kanheri Caves Trust")).toBe("kanheri-caves-trust");
    expect(
      displayNameFromUser({
        email: "a.iyer@anvaya.test",
        metadata: { full_name: "A. Iyer" },
      }),
    ).toBe("A. Iyer");
    expect(displayNameFromUser({ email: "studio@anvaya.test", metadata: {} })).toBe(
      "studio",
    );
  });
});
