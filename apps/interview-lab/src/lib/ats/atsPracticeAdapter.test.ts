import { describe, expect, it } from "vitest";
import { interviewPreparationSchema } from "@devflow/career-core";
import { analyzeAtsMatch } from "./atsAnalyzer";
import { buildCareerPrepRecordFromAtsAnalysis, buildInterviewPreparationFromAtsAnalysis, stableAtsApplicationId } from "./atsPracticeAdapter";

describe("stableAtsApplicationId", () => {
  it("is stable for the same analysis object", () => {
    const r = analyzeAtsMatch("resume text here with react", "job needs react and aws");
    expect(stableAtsApplicationId(r)).toBe(stableAtsApplicationId(r));
  });

  it("changes when summaries change", () => {
    const a = analyzeAtsMatch("A", "job with react");
    const b = analyzeAtsMatch("B", "job with react");
    expect(stableAtsApplicationId(a)).not.toBe(stableAtsApplicationId(b));
  });
});

describe("buildInterviewPreparationFromAtsAnalysis", () => {
  it("matches interviewPreparationSchema", () => {
    const r = analyzeAtsMatch(
      "Senior dev with React, TypeScript. Led migrations.",
      "Senior role: React, Next.js, AWS, mentoring, scalability.",
    );
    const prep = buildInterviewPreparationFromAtsAnalysis(r);
    const parsed = interviewPreparationSchema.safeParse(prep);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.focusAreas.length).toBeGreaterThanOrEqual(4);
      expect(parsed.data.technicalQuestions.length).toBeGreaterThanOrEqual(3);
      expect(parsed.data.estimatedSessionMinutes).toBeGreaterThanOrEqual(15);
    }
  });
});

describe("buildCareerPrepRecordFromAtsAnalysis", () => {
  it("sets prepSource ats and valid preparation", () => {
    const r = analyzeAtsMatch("React developer", "Need React and Docker");
    const row = buildCareerPrepRecordFromAtsAnalysis(r, "prep-ats-1", "2026-05-01T10:00:00.000Z");
    expect(row.prepSource).toBe("ats");
    expect(row.id).toBe("prep-ats-1");
    expect(interviewPreparationSchema.safeParse(row.preparation).success).toBe(true);
  });
});
