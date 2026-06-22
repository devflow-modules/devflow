import { describe, expect, it } from "vitest";
import {
  buildCareerSpecialistFieldsFromSimpleInputs,
  extractJobKeywords,
  extractJobRequirements,
  extractLikelySkills,
  extractResumeLines,
  hasSimplePilotAnalysisInputs,
  normalizeJobDescription,
  normalizeResumeText,
  PILOT_SKILL_CATALOG,
} from "./career-pilot-input-normalizer";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";

describe("normalizeResumeText", () => {
  it("normalizes line breaks and removes repeated empty lines", () => {
    expect(normalizeResumeText("Linha 1\r\n\r\n\r\nLinha 2")).toBe("Linha 1\n\nLinha 2");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeResumeText("   \n  ")).toBe("");
  });
});

describe("extractResumeLines", () => {
  it("extracts multiple lines from a multiline resume", () => {
    const lines = extractResumeLines("Experiência A\n• Resultado B\n\nResultado C");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain("Experiência");
  });

  it("splits single-block text into sentences when needed", () => {
    const lines = extractResumeLines(
      "Desenvolvi APIs REST em Node.js. Reduzi tempo de deploy em 30% com CI/CD.",
    );
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});

describe("extractLikelySkills", () => {
  it("identifies skills present in the text", () => {
    const skills = extractLikelySkills("Experiência com TypeScript, React e Node.js em produção.");
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("React");
    expect(skills).toContain("Node.js");
  });

  it("does not invent skills absent from the text", () => {
    const skills = extractLikelySkills("Experiência com planilhas e atendimento ao cliente.");
    for (const skill of skills) {
      expect(PILOT_SKILL_CATALOG).toContain(skill);
    }
    expect(skills).not.toContain("Kubernetes");
  });

  it("removes duplicate skills", () => {
    const skills = extractLikelySkills("TypeScript TypeScript typescript e React.");
    const lowered = skills.map((s) => s.toLowerCase());
    expect(new Set(lowered).size).toBe(lowered.length);
  });
});

describe("extractJobRequirements", () => {
  it("extracts requirements from multiline job descriptions", () => {
    const requirements = extractJobRequirements(
      "Requisitos:\nExperiência com TypeScript\nInglês intermediário",
    );
    expect(requirements.some((line) => line.includes("TypeScript"))).toBe(true);
    expect(requirements.some((line) => line.includes("intermediário"))).toBe(true);
  });
});

describe("extractJobKeywords", () => {
  it("preserves accented Portuguese tokens", () => {
    const keywords = extractJobKeywords(
      "experiência com backend, inglês intermediário e conhecimento em cloud",
    );
    expect(keywords).toContain("experiência");
    expect(keywords).toContain("inglês");
    expect(keywords).toContain("intermediário");
    expect(keywords).toContain("conhecimento");
    expect(keywords).not.toContain("experi");
    expect(keywords).not.toContain("ingl");
  });

  it("returns empty array for blank text", () => {
    expect(extractJobKeywords("")).toEqual([]);
  });
});

describe("buildCareerSpecialistFieldsFromSimpleInputs", () => {
  it("maps simple resume inputs to specialist fields", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        targetRole: "Desenvolvedor Full Stack",
        resumeText:
          "Desenvolvi APIs em Node.js com TypeScript.\nReduzi deploy em 30% com CI/CD no GitHub Actions.",
      },
      "analyze_resume",
    );
    expect(fields.resumeBullets).toContain("Node.js");
    expect(fields.resumeSkills).toContain("TypeScript");
    expect(fields.targetRoles).toBe("Desenvolvedor Full Stack");
  });

  it("maps job description to requirements for ATS flow", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText: "Experiência com TypeScript e Node.js em APIs REST para SaaS.",
        jobDescription: "Requisitos:\nExperiência com TypeScript\nInglês intermediário",
      },
      "analyze_ats_compatibility",
    );
    expect(fields.jobRequirements).toContain("TypeScript");
    expect(fields.jobRequirements).toContain("intermediário");
  });

  it("maps career plan inputs to target roles and availability", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        careerGoal: "Vaga Full Stack Sênior em 90 dias",
        weeklyAvailability: "10 horas por semana",
        constraints: "Remoto, CLT",
      },
      "plan_career_strategy",
    );
    expect(fields.targetRoles).toContain("Full Stack");
    expect(fields.availability).toContain("10 horas");
    expect(fields.availability).toContain("Remoto");
  });
});

describe("hasSimplePilotAnalysisInputs", () => {
  it("requires sufficient resume text for analyze_resume", () => {
    expect(
      hasSimplePilotAnalysisInputs("analyze_resume", {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText: "curto",
      }),
    ).toBe(false);
    expect(
      hasSimplePilotAnalysisInputs("analyze_resume", {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText:
          "Desenvolvi APIs REST em Node.js com TypeScript para integração com parceiros.",
      }),
    ).toBe(true);
  });

  it("requires job description for ATS comparison", () => {
    expect(
      hasSimplePilotAnalysisInputs("analyze_ats_compatibility", {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText:
          "Desenvolvi APIs REST em Node.js com TypeScript para integração com parceiros.",
        jobDescription: "curta",
      }),
    ).toBe(false);
  });

  it("requires career goal for strategy plan", () => {
    expect(
      hasSimplePilotAnalysisInputs("plan_career_strategy", EMPTY_CAREER_PILOT_SIMPLE_INPUTS),
    ).toBe(false);
    expect(
      hasSimplePilotAnalysisInputs("plan_career_strategy", {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        careerGoal: "Conseguir vaga sênior",
      }),
    ).toBe(true);
  });
});

describe("normalizeJobDescription", () => {
  it("respects maximum length", () => {
    const long = "a".repeat(20_000);
    expect(normalizeJobDescription(long).length).toBeLessThanOrEqual(12_000);
  });
});
