import { describe, expect, it } from "vitest";
import {
  buildCareerSpecialistFieldsFromSimpleInputs,
  extractJobKeywords,
  extractJobRequirements,
  extractLikelySkills,
  extractProfessionalSummary,
  extractResumeExperiences,
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

describe("extractProfessionalSummary", () => {
  it("extracts the first descriptive paragraph before experience sections", () => {
    const summary = extractProfessionalSummary(`Desenvolvedor Full Stack com experiência em React, Next.js, TypeScript e Node.js.

Experiência profissional
TechCorp — Desenvolvedor
Desenvolvi APIs REST.`);
    expect(summary).toBe(
      "Desenvolvedor Full Stack com experiência em React, Next.js, TypeScript e Node.js.",
    );
  });

  it("P1-A — extracts role from official example identity line without full name", () => {
    const resumeText = `Maria Souza — Desenvolvedora de Software Sênior

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros.
Reduzi o tempo de deploy em 30% com pipelines CI/CD.
Liderei um squad de 4 pessoas em projeto de migração cloud.`;
    expect(extractProfessionalSummary(resumeText)).toBe("Desenvolvedora de Software Sênior");
  });

  it("accepts standalone professional title line when no descriptive paragraph exists", () => {
    expect(extractProfessionalSummary("Engenheiro de Software Backend Sênior\n\nExperiência\nDesenvolvi APIs.")).toBe(
      "Engenheiro de Software Backend Sênior",
    );
  });

  it("does not treat weak multi-line resume text as summary", () => {
    const resumeText = `Trabalhei com sistemas.
Ajudei em projetos.
Responsável por algumas tarefas.
Conhecimento em tecnologia.`;
    expect(extractProfessionalSummary(resumeText)).toBe("");
  });

  it("does not duplicate summary lines as resume bullets", () => {
    const resumeText = `Desenvolvedor Full Stack com experiência em React, Next.js, TypeScript e Node.js.

Experiência profissional
Desenvolvi APIs REST em Node.js.`;
    const summary = extractProfessionalSummary(resumeText);
    const lines = extractResumeLines(resumeText, summary);
    expect(lines.join("\n")).not.toContain("Desenvolvedor Full Stack com experiência");
    expect(lines.some((line) => line.includes("Desenvolvi APIs"))).toBe(true);
  });
});

describe("extractResumeLines", () => {
  it("extracts multiple lines from a multiline resume", () => {
    const lines = extractResumeLines("Experiência A\n• Resultado B\n\nResultado C");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain("Experiência");
  });

  it("P1-B — preserves weak resume lines as bullet candidates", () => {
    const resumeText = `Trabalhei com sistemas.
Ajudei em projetos.
Responsável por algumas tarefas.
Conhecimento em tecnologia.`;
    const lines = extractResumeLines(resumeText);
    expect(lines.length).toBe(4);
    expect(lines.some((line) => line.includes("Trabalhei"))).toBe(true);
  });

  it("P1 — excludes experience header from resume bullets and recommendations", () => {
    const resumeText = `Maria Souza — Desenvolvedora de Software Sênior

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros.
Reduzi o tempo de deploy em 30% com pipelines CI/CD.
Liderei um squad de 4 pessoas em projeto de migração cloud.`;
    const summary = extractProfessionalSummary(resumeText);
    const lines = extractResumeLines(resumeText, summary);
    expect(lines.some((line) => line.includes("TechCorp (2021"))).toBe(false);
    expect(lines).toHaveLength(3);

    const experiences = extractResumeExperiences(resumeText, summary);
    expect(experiences[0]?.company).toBe("TechCorp");
    expect(experiences[0]?.title).toBe("Desenvolvedora Backend");
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
  it("does not treat action-only resume text as professional summary", () => {
    const resumeText =
      "Desenvolvi APIs em Node.js com TypeScript.\nReduzi deploy em 30% com CI/CD no GitHub Actions.";
    expect(extractProfessionalSummary(resumeText)).toBe("");
    const lines = extractResumeLines(resumeText);
    expect(lines.some((line) => line.includes("Node.js"))).toBe(true);
  });

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
    expect(fields.resumeSummary).toBe("");
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
