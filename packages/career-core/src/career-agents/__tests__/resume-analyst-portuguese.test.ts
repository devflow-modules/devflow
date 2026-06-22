import { describe, expect, it } from "vitest";
import { orchestrateCareerAgents } from "../orchestrator.js";
import { runResumeAnalyst, __resumeAnalystTestUtils } from "../agents/resume-analyst.js";
import type { CareerAgentContext, CareerAnalysisInput } from "../types.js";
import { createSampleCareerBundle } from "./fixtures.js";

const REQUESTED_AT = "2026-06-22T12:00:00.000Z";

function ctx(analysisInput: CareerAnalysisInput): CareerAgentContext {
  return {
    intent: "analyze_resume",
    analysisInput,
    careerBundle: createSampleCareerBundle(),
    selectedSignalIds: [],
    availableSignals: [],
    explicitConsent: true,
  };
}

/** Fixture A — exemplo atual da Career Suite (Maria / backend PT). */
const FIXTURE_A: CareerAnalysisInput = {
  resumeSnapshot: {
    summary: "Desenvolvedora de Software com experiência em backend e integrações.",
    skills: ["TypeScript", "Node.js", "PostgreSQL", "AWS"],
    experiences: [
      {
        title: "Desenvolvedora Backend",
        company: "TechCorp",
        bullets: [
          "Desenvolvi APIs REST em Node.js para integração com parceiros externos.",
          "Reduzi o tempo de deploy em 30% com pipelines CI/CD no GitHub Actions.",
          "Liderei um squad de 4 pessoas em projeto de migração para AWS.",
        ],
      },
    ],
  },
  targetRole: "Engenheiro de Software Backend",
  targetStack: ["TypeScript", "Node.js", "PostgreSQL"],
};

/** Fixture B — currículo sem métricas. */
const FIXTURE_B: CareerAnalysisInput = {
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
};

/** Fixture C — currículo fraco. */
const FIXTURE_C: CareerAnalysisInput = {
  resumeSnapshot: {
    skills: ["HTML"],
    experiences: [
      {
        title: "Estagiário",
        company: "Local",
        bullets: ["Ajudei no time", "Fiz tarefas"],
      },
    ],
  },
};

/** Fixture D — currículo em inglês (regressão EN). */
const FIXTURE_D: CareerAnalysisInput = {
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
};

/** Fixture E — acentos e Unicode. */
const FIXTURE_E: CareerAnalysisInput = {
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
};

describe("resume_analyst Portuguese action verbs", () => {
  const { startsWithActionVerb, hasMetric, isVagueBullet, isStrongBullet, firstToken } =
    __resumeAnalystTestUtils;

  it("recognizes Portuguese past-tense verbs on the first token", () => {
    expect(startsWithActionVerb("Desenvolvi APIs REST em Node.js.")).toBe(true);
    expect(startsWithActionVerb("Reduzi o tempo de deploy em 30%.")).toBe(true);
    expect(startsWithActionVerb("Liderei um squad de 4 pessoas.")).toBe(true);
    expect(startsWithActionVerb("Implementei autenticação JWT.")).toBe(true);
    expect(startsWithActionVerb("Construí uma plataforma SaaS.")).toBe(true);
  });

  it("strips punctuation from the first token before matching", () => {
    expect(firstToken("Desenvolvi,")).toBe("desenvolvi");
    expect(startsWithActionVerb("Desenvolvi, APIs REST.")).toBe(true);
  });

  it("preserves accents and rejects noun prefixes", () => {
    expect(startsWithActionVerb("Desenvolvimento de APIs")).toBe(false);
    expect(startsWithActionVerb("Experiência com React")).toBe(false);
    expect(startsWithActionVerb("Construí integração com parceiros.")).toBe(true);
  });

  it("does not accept partial verb matches", () => {
    expect(startsWithActionVerb("Desenvolvedor full stack")).toBe(false);
    expect(startsWithActionVerb("Reduzindo custos")).toBe(false);
  });

  it("detects metrics including people counts", () => {
    expect(hasMetric("Liderei um squad de 4 pessoas.")).toBe(true);
    expect(hasMetric("Reduzi o tempo de deploy em 30%.")).toBe(true);
  });

  it("marks strong bullets with metrics and verbs as non-vague", () => {
    expect(isStrongBullet("Reduzi o tempo de deploy em 30% com pipelines CI/CD.")).toBe(true);
    expect(isVagueBullet("Reduzi o tempo de deploy em 30% com pipelines CI/CD.")).toBe(false);
  });
});

describe("resume_analyst Portuguese fixtures", () => {
  it("Fixture A — exemplo atual: score coerente, PT, verbos e métricas", () => {
    const result = runResumeAnalyst(ctx(FIXTURE_A));
    const analysis = result.resumeAnalysis;

    expect(result.summary).toMatch(/Análise concluída com pontuação estrutural/i);
    expect(result.summary).not.toMatch(/Resume review completed/i);
    expect(analysis.score).toBeGreaterThanOrEqual(65);
    expect(analysis.score).toBeLessThanOrEqual(85);
    expect(analysis.strengths.some((s) => /resumo profissional/i.test(s))).toBe(true);
    expect(analysis.strengths.some((s) => /métricas verificáveis/i.test(s))).toBe(true);
    expect(analysis.strengths.some((s) => /liderança/i.test(s))).toBe(true);
    expect(analysis.bulletRecommendations.filter((b) => b.reason.includes("vago")).length).toBe(0);
    expect(analysis.weaknesses.every((w) => !/\bResume\b/i.test(w))).toBe(true);
  });

  it("Fixture B — sem métricas: score intermediário e recomendação sem inventar números", () => {
    const result = runResumeAnalyst(ctx(FIXTURE_B));
    const analysis = result.resumeAnalysis;

    expect(analysis.score).toBeGreaterThanOrEqual(30);
    expect(analysis.score).toBeLessThanOrEqual(75);
    expect(analysis.weaknesses.some((w) => /mensurável/i.test(w))).toBe(true);
    expect(analysis.bulletRecommendations.some((b) => /somente se esses dados forem reais/i.test(b.recommendation))).toBe(
      true,
    );
    expect(JSON.stringify(analysis)).not.toMatch(/\d{2,}%/);
  });

  it("Fixture C — currículo fraco: score baixo e orientações úteis", () => {
    const result = runResumeAnalyst(ctx(FIXTURE_C));
    const analysis = result.resumeAnalysis;

    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(30);
    expect(analysis.weaknesses.length).toBeGreaterThan(0);
    expect(analysis.nextActions.length).toBeGreaterThan(0);
  });

  it("Fixture D — inglês: regressão positiva para verbos EN", () => {
    const result = runResumeAnalyst(ctx(FIXTURE_D));
    expect(result.resumeAnalysis.score).toBeGreaterThan(55);
    expect(result.resumeAnalysis.bulletRecommendations.filter((b) => b.reason.includes("vago")).length).toBe(0);
  });

  it("Fixture E — acentos preservados no output", () => {
    const result = runResumeAnalyst(ctx(FIXTURE_E));
    expect(result.summary).toMatch(/Análise concluída/i);
    expect(result.resumeAnalysis.strengths.join(" ")).toMatch(/integração|liderança|contínuas/i);
  });
});

describe("resume_analyst orchestration regression", () => {
  it("returns Portuguese participant summary via orchestrator", () => {
    const result = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: createSampleCareerBundle(),
          selectedSignalIds: [],
          analysisInput: FIXTURE_A,
        },
      },
      REQUESTED_AT,
    );

    expect(result.status).toBe("completed");
    expect(result.summary).toMatch(/Análise concluída/i);
    expect(result.evidence.some((e) => e.startsWith("pontuação_currículo:"))).toBe(true);
  });

  it("flags missing summary in Portuguese", () => {
    const result = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: createSampleCareerBundle(),
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              skills: ["TypeScript"],
              experiences: [
                { title: "Engenheiro", company: "Acme", bullets: ["Ajudei no time com tarefas diversas"] },
              ],
            },
          },
        },
      },
      REQUESTED_AT,
    );

    expect(result.resumeAnalysis?.weaknesses.some((w) => /resumo profissional/i.test(w))).toBe(true);
  });

  it("flags exaggeration in Portuguese without inventing metrics", () => {
    const result = orchestrateCareerAgents(
      {
        intent: "analyze_resume",
        explicitConsent: true,
        context: {
          careerBundle: createSampleCareerBundle(),
          selectedSignalIds: [],
          analysisInput: {
            resumeSnapshot: {
              summary: "Especialista perfeito em engenharia.",
              skills: ["TypeScript", "Node.js"],
              experiences: [
                {
                  title: "Engenheiro",
                  company: "Acme",
                  bullets: ["Fui o melhor engenheiro que construiu o sistema perfeito para todos."],
                },
              ],
            },
          },
        },
      },
      REQUESTED_AT,
    );
    expect(result.resumeAnalysis?.risks.some((r) => /exagero/i.test(r))).toBe(true);
  });
});

describe("resume_analyst contextual recommendations", () => {
  it("suggests API-specific guidance for vague API bullets", () => {
    const result = runResumeAnalyst(
      ctx({
        resumeSnapshot: {
          skills: ["Node.js"],
          experiences: [
            {
              title: "Dev",
              company: "Co",
              bullets: ["Desenvolvi APIs REST em Node.js para integração com parceiros."],
            },
          ],
        },
      }),
    );
    const rec = result.resumeAnalysis.bulletRecommendations[0];
    expect(rec?.recommendation).toMatch(/parceiros|automatizado|ganho operacional/i);
    expect(rec?.recommendation).not.toMatch(/30%|50%/);
  });
});
