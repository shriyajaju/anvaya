import { describe, expect, it } from "vitest";
import { buildReconstructionPrompt } from "@/lib/reconstruction/prompt";

describe("buildReconstructionPrompt", () => {
  it("builds the fixed template from database fields only", () => {
    const prompt = buildReconstructionPrompt({
      periodAndStyle: "c. 200 CE · Rock-cut hall",
      elements: [
        {
          name: "Roof",
          description: "Ridge height inferred from beam sockets",
          evidenceNotes: ["Beam socket survey 2026"],
        },
      ],
    });
    expect(prompt).toContain("Keep the existing stone structure in this photograph exactly as it is.");
    expect(prompt).toContain("Roof (Ridge height inferred from beam sockets; evidence: Beam socket survey 2026)");
    expect(prompt).toContain("Period and style: c. 200 CE · Rock-cut hall.");
    expect(prompt).toContain("No colour, no texture, no people");
  });
});
