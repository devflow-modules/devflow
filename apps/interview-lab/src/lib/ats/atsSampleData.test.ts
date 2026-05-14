import { describe, expect, it } from "vitest";
import { sampleJobDescriptionText, sampleResumeText } from "./atsSampleData";

describe("atsSampleData", () => {
  it("exports non-empty demo strings with expected stack signals", () => {
    expect(sampleResumeText.length).toBeGreaterThan(120);
    expect(sampleJobDescriptionText.length).toBeGreaterThan(120);
    const bundle = `${sampleResumeText}\n${sampleJobDescriptionText}`.toLowerCase();
    expect(bundle).toContain("next.js");
    expect(bundle).toContain("typescript");
    expect(bundle).toContain("postgresql");
  });
});
