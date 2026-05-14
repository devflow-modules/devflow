import { describe, expect, it } from "vitest";
import {
  exportBriefingMarkdown,
  generateInterviewBriefing,
  briefingInputFromCareerApplication,
} from "./interview-briefing";

describe("generateInterviewBriefing", () => {
  const base = {
    company: "Acme",
    role: "Backend Engineer",
    jobDescription: "We need strong TypeScript and PostgreSQL",
    requiredSkills: ["Zeta", "Alpha"],
    interviewType: "live_coding" as const,
    language: "english" as const,
  };

  it("is deterministic for the same input", () => {
    const a = generateInterviewBriefing(base);
    const b = generateInterviewBriefing(base);
    expect(a).toEqual(b);
  });

  it("sorts skills lexicographically in generated copy", () => {
    const out = generateInterviewBriefing({
      ...base,
      requiredSkills: ["Zeta", "Alpha"],
    });
    expect(out.corePitch[0]).toContain("Alpha");
    expect(out.corePitch[0]).toContain("Zeta");
  });

  it("changes technical angle for system_design", () => {
    const lc = generateInterviewBriefing({ ...base, interviewType: "live_coding" });
    const sd = generateInterviewBriefing({ ...base, interviewType: "system_design" });
    expect(sd.likelyTechnicalQuestions.some((q) => /cache/i.test(q))).toBe(true);
    expect(lc.likelyTechnicalQuestions.join(" ")).not.toEqual(sd.likelyTechnicalQuestions.join(" "));
  });

  it("Portuguese branch differs from English", () => {
    const en = generateInterviewBriefing({ ...base, language: "english" });
    const pt = generateInterviewBriefing({ ...base, language: "portuguese" });
    expect(en.corePitch[0]).toContain("I'm focused");
    expect(pt.corePitch[0]).toContain("preparar");
  });
});

describe("exportBriefingMarkdown", () => {
  it("includes key sections", () => {
    const input = briefingInputFromCareerApplication({
      id: "x1",
      company: "Co",
      role: "Dev",
      requiredSkills: ["Go"],
    });
    const content = generateInterviewBriefing({ ...input, interviewType: "behavioral", language: "english" });
    const md = exportBriefingMarkdown("Co — Dev", input, content);
    expect(md).toContain("# Interview Briefing");
    expect(md).toContain("Core pitch");
    expect(md).toContain("STAR outlines");
    expect(md).toContain("no external AI");
    expect(md).toContain("x1");
  });
});

describe("briefingInputFromCareerApplication", () => {
  it("maps career application fields", () => {
    const i = briefingInputFromCareerApplication({
      id: "app-1",
      company: "Globex",
      role: "SRE",
      jobDescription: "On-call",
      requiredSkills: ["Linux"],
    });
    expect(i.company).toBe("Globex");
    expect(i.sourceApplicationId).toBe("app-1");
    expect(i.interviewType).toBe("live_coding");
  });
});
