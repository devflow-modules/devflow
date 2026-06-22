import { describe, expect, it } from "vitest";
import {
  createCareerBundle,
  orchestrateCareerAgents,
  runResumeAnalyst,
  type CareerAgentContext,
  type CareerAnalysisInput,
} from "@devflow/career-core";
import { __resumeAnalystTestUtils } from "../../../../../packages/career-core/src/career-agents/agents/resume-analyst";
import { buildCareerSpecialistFieldsFromSimpleInputs } from "./career-pilot-input-normalizer";
import {
  buildPilotCareerBundleFromFields,
  canSubmitResumeAnalysis,
} from "./build-pilot-career-bundle";
import { buildSpecialistAnalysisInput } from "./career-chat-workspace";
import { EMPTY_CAREER_PILOT_SIMPLE_INPUTS } from "./career-pilot-simple-inputs";

const FIXTURE_A_TEXT = `Maria Souza — Desenvolvedora de Software Sênior

Experiência profissional
TechCorp (2021–presente) — Desenvolvedora Backend
Desenvolvi APIs REST em Node.js para integração com parceiros externos.
Reduzi o tempo de deploy em 30% com pipelines CI/CD no GitHub Actions.
Liderei um squad de 4 pessoas em projeto de migração para AWS.

Competências: TypeScript, Node.js, PostgreSQL, AWS, Docker, Git`;

const FIXTURE_C_TEXT = `Trabalhei com sistemas.
Ajudei em projetos.
Responsável por algumas tarefas.
Conhecimento em tecnologia.`;

function sampleContext(input: CareerAnalysisInput): CareerAgentContext {
  return {
    intent: "analyze_resume",
    analysisInput: input,
    careerBundle: createCareerBundle(
      [
        {
          id: "fixture",
          company: "Co",
          role: "Dev",
          source: "manual",
          requiredSkills: ["—"],
          status: "applied",
        },
      ],
      { mainStack: [], targetRole: "Dev" },
    ),
    selectedSignalIds: [],
    availableSignals: [],
    explicitConsent: true,
  };
}

function runPilotPipeline(resumeText: string, targetRole = "Engenheiro Backend") {
  const fields = buildCareerSpecialistFieldsFromSimpleInputs(
    { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, targetRole, resumeText },
    "analyze_resume",
  );
  const bundle = buildPilotCareerBundleFromFields(fields);
  const canSubmit = canSubmitResumeAnalysis(
    "analyze_resume",
    { ...EMPTY_CAREER_PILOT_SIMPLE_INPUTS, targetRole, resumeText },
    fields,
  );
  const analysisInput = buildSpecialistAnalysisInput({
    action: "analyze_resume",
    fields,
    mainStack: bundle.candidate?.mainStack ?? [],
    fallbackRole: bundle.candidate?.targetRole ?? targetRole,
  });
  const result = orchestrateCareerAgents(
    {
      intent: "analyze_resume",
      explicitConsent: true,
      context: {
        careerBundle: bundle,
        selectedSignalIds: [],
        analysisInput,
      },
    },
    "2026-06-22T12:00:00.000Z",
  );
  const bullets = fields.resumeBullets.split("\n").filter(Boolean);
  const quantified = bullets.filter((bullet) =>
    __resumeAnalystTestUtils.hasMeaningfulMetric(bullet),
  ).length;
  const vague =
    result.resumeAnalysis?.bulletRecommendations.filter((item) => item.reason.includes("vago"))
      .length ?? 0;

  return { fields, canSubmit, result, quantified, vague };
}

describe("career pilot walkthrough fixtures", () => {
  it("Fixture A — official simplified input end-to-end", () => {
    const { fields, canSubmit, result, quantified, vague } = runPilotPipeline(FIXTURE_A_TEXT);
    expect(fields.resumeSummary).toBe("Desenvolvedora de Software Sênior");
    expect(canSubmit).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.resumeAnalysis?.score).toBeGreaterThanOrEqual(65);
    expect(result.resumeAnalysis?.score).toBeLessThanOrEqual(90);
    expect(quantified).toBe(2);
    expect(vague).toBeGreaterThanOrEqual(1);
    expect(result.summary).toMatch(/Análise concluída/i);
    expect(result.summary).not.toMatch(/mensurávelis/);
  });

  it("Fixture C — weak resume submits with low score", () => {
    const { fields, canSubmit, result, vague } = runPilotPipeline(FIXTURE_C_TEXT);
    expect(fields.resumeSummary).toBe("");
    expect(canSubmit).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.resumeAnalysis?.score).toBeGreaterThanOrEqual(0);
    expect(result.resumeAnalysis?.score).toBeLessThanOrEqual(35);
    expect(vague).toBeGreaterThan(0);
  });

  it("Fixture B/D/E — analyst snapshots remain stable", () => {
    const fixtureB = runResumeAnalyst(
      sampleContext({
        resumeSnapshot: {
          skills: ["TypeScript", "React", "Node.js", "Express", "PostgreSQL"],
          experiences: [
            {
              title: "Desenvolvedor Full Stack",
              company: "Startup",
              bullets: [
                "Desenvolvi interfaces com React e Next.js para o produto principal.",
                "Implementei autenticação JWT com cookies HttpOnly.",
                "Criei APIs REST com Node.js, Express e Prisma.",
              ],
            },
          ],
        },
      }),
    );
    const fixtureD = runResumeAnalyst(
      sampleContext({
        resumeSnapshot: {
          summary: "Backend engineer focused on reliable services.",
          skills: ["TypeScript", "Node.js", "PostgreSQL"],
          experiences: [
            {
              title: "Senior Engineer",
              company: "Acme",
              bullets: [
                "Reduced API latency by 35% by optimizing PostgreSQL queries.",
                "Led migration of 12 services to TypeScript.",
              ],
            },
          ],
        },
      }),
    );
    const fixtureE = runResumeAnalyst(
      sampleContext({
        resumeSnapshot: {
          summary: "Profissional com experiência em integração e liderança técnica.",
          skills: ["TypeScript"],
          experiences: [
            {
              title: "Engenheiro",
              company: "Corp",
              bullets: [
                "Construí integração com parceiros internacionais e documentação em inglês.",
                "Coordenei entregas contínuas com foco em qualidade.",
              ],
            },
          ],
        },
      }),
    );

    expect(fixtureB.resumeAnalysis.score).toBeGreaterThanOrEqual(30);
    expect(fixtureD.resumeAnalysis.score).toBeGreaterThan(55);
    expect(fixtureE.summary).toMatch(/Análise concluída/i);
    expect(fixtureE.resumeAnalysis.strengths.join(" ")).toMatch(/liderança|integração|contínuas/i);
  });
});
