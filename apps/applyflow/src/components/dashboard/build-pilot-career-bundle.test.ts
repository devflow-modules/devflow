import { describe, expect, it } from "vitest";
import {
  buildPilotCareerBundleFromFields,
  canSubmitResumeAnalysis,
  hasPilotAnalysisInputs,
} from "./build-pilot-career-bundle";
import { buildCareerSpecialistFieldsFromSimpleInputs } from "./career-pilot-input-normalizer";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";
import { EMPTY_SPECIALIST_FIELDS } from "./career-chat-workspace";
import { CAREER_PILOT_EXAMPLE_FIELDS } from "./career-pilot-content";

describe("buildPilotCareerBundleFromFields", () => {
  it("builds a session bundle from specialist fields without exposing contract names in UI", () => {
    const bundle = buildPilotCareerBundleFromFields(CAREER_PILOT_EXAMPLE_FIELDS);

    expect(bundle.applications).toHaveLength(1);
    expect(bundle.applications[0]?.role).toContain("Backend");
    expect(bundle.candidate?.mainStack).toContain("TypeScript");
  });
});

describe("hasPilotAnalysisInputs", () => {
  it("requires resume data for analyze_resume", () => {
    expect(hasPilotAnalysisInputs("analyze_resume", EMPTY_SPECIALIST_FIELDS)).toBe(false);
    expect(
      hasPilotAnalysisInputs("analyze_resume", {
        ...EMPTY_SPECIALIST_FIELDS,
        resumeSkills: "TypeScript",
      }),
    ).toBe(true);
  });

  it("requires job requirements for ATS comparison", () => {
    expect(
      hasPilotAnalysisInputs("analyze_ats_compatibility", {
        ...EMPTY_SPECIALIST_FIELDS,
        resumeSkills: "TypeScript",
      }),
    ).toBe(false);
    expect(hasPilotAnalysisInputs("analyze_ats_compatibility", CAREER_PILOT_EXAMPLE_FIELDS)).toBe(
      true,
    );
  });

  it("requires target roles for career strategy", () => {
    expect(hasPilotAnalysisInputs("plan_career_strategy", EMPTY_SPECIALIST_FIELDS)).toBe(false);
    expect(
      hasPilotAnalysisInputs("plan_career_strategy", {
        ...EMPTY_SPECIALIST_FIELDS,
        targetRoles: "Backend Engineer",
      }),
    ).toBe(true);
  });
});

describe("canSubmitResumeAnalysis", () => {
  const weakResumeText = `Trabalhei com sistemas.
Ajudei em projetos.
Responsável por algumas tarefas.
Conhecimento em tecnologia.`;

  it("P1-B — enables submit for weak resume with valid bullets and no skills", () => {
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText: weakResumeText,
      },
      "analyze_resume",
    );
    expect(fields.resumeBullets.split("\n").filter(Boolean).length).toBeGreaterThan(0);
    expect(hasPilotAnalysisInputs("analyze_resume", fields)).toBe(true);
    expect(
      canSubmitResumeAnalysis(
        "analyze_resume",
        { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, resumeText: weakResumeText },
        fields,
      ),
    ).toBe(true);
    expect(buildPilotCareerBundleFromFields(fields).applications.length).toBeGreaterThan(0);
  });

  it("aligns button eligibility with bundle creation for official example", () => {
    const resumeText = `Maria Souza — Desenvolvedora de Software Sênior

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros.
Reduzi o tempo de deploy em 30% com pipelines CI/CD.
Liderei um squad de 4 pessoas em projeto de migração cloud.`;
    const fields = buildCareerSpecialistFieldsFromSimpleInputs(
      {
        ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
        resumeText,
      },
      "analyze_resume",
    );
    expect(fields.resumeSummary).toBe("Desenvolvedora de Software Sênior");
    expect(
      canSubmitResumeAnalysis(
        "analyze_resume",
        { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, resumeText },
        fields,
      ),
    ).toBe(true);
  });

  it("blocks submit when resume text is long but no analyzable content remains", () => {
    const fields = {
      ...EMPTY_SPECIALIST_FIELDS,
      resumeSummary: "",
      resumeBullets: "",
      resumeSkills: "",
    };
    expect(
      canSubmitResumeAnalysis(
        "analyze_resume",
        {
          ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS,
          resumeText: " ".repeat(20) + "x".repeat(30),
        },
        fields,
      ),
    ).toBe(false);
  });
});
