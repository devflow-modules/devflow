import { describe, expect, it } from "vitest";
import {
  GUIDED_SCRIPT_USAGE_EXPORT,
  INTERVIEW_SCRIPT_PHASES,
  buildQuickComplexityCopy,
  buildQuickOpeningCopy,
  buildQuickStuckCopy,
  getInterviewPhase,
} from "@/lib/interview-script";

describe("INTERVIEW_SCRIPT_PHASES", () => {
  it("defines all required phases", () => {
    const ids = INTERVIEW_SCRIPT_PHASES.map((p) => p.id);
    expect(ids).toEqual([
      "opening",
      "understanding",
      "approach",
      "coding",
      "testing",
      "complexity",
      "closing",
      "stuck-recovery",
    ]);
  });

  it("has a non-empty title, description, and prompts for every phase", () => {
    for (const p of INTERVIEW_SCRIPT_PHASES) {
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.shortDescription.trim().length).toBeGreaterThan(0);
      expect(p.prompts.length).toBeGreaterThan(0);
      for (const line of p.prompts) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("includes essential opening and stuck phrases", () => {
    const opening = getInterviewPhase("opening");
    expect(opening?.prompts[0]).toContain("restate");
    expect(opening?.prompts[1]).toMatch(/confirm the input/i);
    const stuck = getInterviewPhase("stuck-recovery");
    expect(stuck?.prompts[0]).toMatch(/edge case/i);
  });
});

describe("quick copy builders", () => {
  it("joins opening prompts", () => {
    const t = buildQuickOpeningCopy();
    expect(t).toContain("Let me restate");
    expect(t).toContain("Before coding");
  });

  it("returns first stuck phrase", () => {
    expect(buildQuickStuckCopy()).toBe(getInterviewPhase("stuck-recovery")!.prompts[0]);
  });

  it("joins complexity prompts", () => {
    const t = buildQuickComplexityCopy();
    expect(t).toContain("time complexity");
    expect(t).toContain("space complexity");
  });
});

describe("GUIDED_SCRIPT_USAGE_EXPORT", () => {
  it("matches ChatGPT export placeholder", () => {
    expect(GUIDED_SCRIPT_USAGE_EXPORT).toContain("Not tracked");
  });
});
