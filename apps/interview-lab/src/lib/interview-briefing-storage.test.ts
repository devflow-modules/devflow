// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { generateInterviewBriefing } from "./interview-briefing";
import {
  buildBriefingRecord,
  deleteInterviewBriefing,
  loadInterviewBriefings,
  saveInterviewBriefing,
} from "./interview-briefing-storage";

describe("interview-briefing-storage", () => {
  beforeEach(() => {
    localStorage.removeItem("devflow:interview-lab:interview-briefing:v1");
  });

  it("round-trips a briefing record", () => {
    const input = {
      company: "Co",
      role: "Engineer",
      jobDescription: "",
      requiredSkills: ["TS"],
      interviewType: "recruiter_screen" as const,
      language: "english" as const,
    };
    const content = generateInterviewBriefing(input);
    const record = buildBriefingRecord("Co — Engineer", input, content);
    saveInterviewBriefing(record);
    const all = loadInterviewBriefings();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe("Co — Engineer");
    expect(all[0]!.content.corePitch.length).toBeGreaterThan(0);
  });

  it("deleteInterviewBriefing removes row", () => {
    const input = {
      company: "A",
      role: "B",
      jobDescription: "",
      requiredSkills: [],
      interviewType: "behavioral" as const,
      language: "portuguese" as const,
    };
    const r = buildBriefingRecord("A — B", input, generateInterviewBriefing(input));
    saveInterviewBriefing(r);
    deleteInterviewBriefing(r.id);
    expect(loadInterviewBriefings()).toHaveLength(0);
  });
});
