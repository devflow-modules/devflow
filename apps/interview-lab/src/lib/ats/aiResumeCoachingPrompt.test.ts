import { describe, expect, it } from "vitest";
import { analyzeAtsMatch } from "./atsAnalyzer";
import { buildAiResumeCoachingUserPrompt, cloneCoachingInput } from "./aiResumeCoachingPrompt";
import { sampleJobDescriptionText, sampleResumeText } from "./atsSampleData";

describe("buildAiResumeCoachingUserPrompt", () => {
  it("includes ATS matched keywords context and does not mutate the input object", () => {
    const ats = analyzeAtsMatch(sampleResumeText, sampleJobDescriptionText);
    const input = {
      resumeText: sampleResumeText,
      jobDescriptionText: sampleJobDescriptionText,
      atsAnalysis: ats,
    };
    const before = JSON.stringify(input);
    const user = buildAiResumeCoachingUserPrompt(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(user).toContain("Local ATS-style analysis");
    for (const k of ats.matchedKeywords.slice(0, 4)) {
      expect(user).toContain(k);
    }
  });

  it("cloneCoachingInput produces independent nested arrays", () => {
    const ats = analyzeAtsMatch("React dev with TypeScript.", "Need React, AWS, Docker.");
    const input = { resumeText: "x", jobDescriptionText: "y", atsAnalysis: ats };
    const clone = cloneCoachingInput(input);
    clone.atsAnalysis.matchedKeywords.push("__mut__");
    expect(input.atsAnalysis.matchedKeywords.includes("__mut__")).toBe(false);
  });
});
