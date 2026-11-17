import { describe, expect, it } from "vitest";
import { createApplicationPackV2 } from "../application-pack-v2.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import {
  explainPackBlock,
  humanizePackBlockDetail,
  postingHasWorkModelContradiction,
} from "../explain-pack-block.js";
import { evidenceFromProfile } from "../evidence-from-profile.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { createResumeLibraryFromProfile } from "../resume-library.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";
import { presentInboxJobAnalysis } from "../inbox-analysis-presentation.js";
import { canCreateApplicationPack } from "../application-pack.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";

const NOW = new Date("2026-11-16T15:00:00.000Z");

/** Solvd-like: TypeScript + React seniority posting; thin profile → needs_info / no Pack. */
const SOLVD_LIKE_JOB = `Senior / Lead Full Stack Engineer (TypeScript + React) — Solvd, Inc.
Remote LATAM.
Requirements:
- 5+ years of professional experience
- TypeScript
- React
- Strong English communication
- Experience leading delivery for enterprise clients
`;

/**
 * Stefanini-like (remote BR): explicit remote-in-Brazil posting.
 *
 * Origin note for prior "hybrid" signal: an earlier draft fixture contained the
 * literal line "Modelo híbrido.", which `extractJobIntelligence` maps to
 * workModel=hybrid via `/modelo\s+h[ií]brido/i` in job-intelligence.ts.
 * That was fixture wording — not a live Stefanini scrape — and conflicted with
 * a remote-Brazil reading of the same opportunity. This fixture is explicit remote.
 */
const STEFANINI_REMOTE_BR_JOB = `Desenvolvedor Full Stack (Node.js + React) Sr — Stefanini Brasil
Remoto no Brasil. Vaga 12825537.
Requisitos:
- Node.js
- React
- Experiência sênior com APIs
- Inglês intermediário
- Disponibilidade para atuar no Brasil
`;

/**
 * Contradictory Stefanini-like: hybrid + 100% remote in the same posting text.
 * Extraction may pick hybrid first; explainPackBlock surfaces the contradiction
 * as an announcement verification item (no extraction/matching fix in this PR).
 */
const STEFANINI_CONTRADICTORY_JOB = `Desenvolvedor Full Stack (Node.js + React) Sr — Stefanini Brasil
Modelo híbrido. Também 100% remoto no Brasil. Vaga 12825537.
Requisitos:
- Node.js
- React
- Experiência sênior com APIs
- Inglês intermediário
- Disponibilidade para atuar no Brasil
`;

function thinProfile() {
  return validateCandidateProfile({
    name: "QA Candidate",
    roles: ["Full Stack Engineer"],
    skills: { React: 5, TypeScript: 5, Nodejs: 4 },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: {},
  });
}

describe("explainPackBlock", () => {
  it("reproduz bloqueio Solvd-like: needs_info, allowPack false, itens acionáveis sem culpar só o perfil", () => {
    const profile = thinProfile();
    const library = createResumeLibraryFromProfile(profile, { source: "manual", now: NOW });
    const job = ingestApplyFlowJob({
      description: SOLVD_LIKE_JOB,
      source: "paste",
      profile,
      resumeLibrary: library,
      now: NOW,
      id: "job_fixture_solvd_like",
      company: "Solvd, Inc.",
      title: "Senior / Lead Full Stack Engineer (TypeScript + React)",
      url: "https://jobs.ashbyhq.com/solvd/example",
    });
    const presented = presentInboxJobAnalysis(job, profile);
    expect(presented.decision).toBe("needs_info");
    expect(presented.allowPack).toBe(false);
    expect(canCreateApplicationPack(job, library)).toBe(false);

    const evidence = evidenceFromProfile(profile);
    const decision = evaluateJobDecisionV2({
      jobText: SOLVD_LIKE_JOB,
      evidence,
      profile,
      jobId: job.id,
    });
    expect(decision.decision).toBe("needs_info");

    const pack = createApplicationPackV2({
      jobId: job.id,
      jobText: SOLVD_LIKE_JOB,
      profile,
      evidence,
      decision,
      resumeLibrary: library,
    });
    expect(pack.status).toBe("blocked");
    expect(pack.decision).toBe("needs_info");

    const explanation = explainPackBlock({
      decision,
      pack,
      profile,
      jobText: SOLVD_LIKE_JOB,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    expect(explanation.blocked).toBe(true);
    expect(explanation.canPrepareManually).toBe(true);
    expect(explanation.items.length).toBeGreaterThan(0);
    expect(explanation.nextAction.toLowerCase()).not.toMatch(/edite o perfil para liberar o pack/);
    expect(explanation.nextAction.toLowerCase()).toMatch(/anúncio|manual/);
    expect(pack.reason).not.toMatch(/^Complete seu perfil para concluir a análise\. Pack não é/);
    expect(explanation.summary.length).toBeGreaterThan(10);
    expect(explanation.title).toMatch(/anúncio|evidência|perfil|indisponível/i);
    // Candidate-facing copy must not leak engine keys.
    expect(explanation.summary).not.toMatch(/\blocation\b|\bseniority\b/i);
    expect(explanation.items.every((item) => !/\blocation\b|\bseniority\b/i.test(item.label))).toBe(true);
  });

  it("Stefanini remoto no Brasil: não trata Brasil como localização faltando no anúncio", () => {
    const profile = thinProfile();
    const evidence = evidenceFromProfile(profile);
    const intel = extractJobIntelligence(STEFANINI_REMOTE_BR_JOB);
    expect(intel.workModel).toBe("remote");
    expect(postingHasWorkModelContradiction(STEFANINI_REMOTE_BR_JOB)).toBe(false);

    const decision = evaluateJobDecisionV2({
      jobText: STEFANINI_REMOTE_BR_JOB,
      evidence,
      profile,
      jobId: "job_fixture_stefanini_remote_br",
    });
    expect(decision.decision).toBe("needs_info");

    const explanation = explainPackBlock({
      decision,
      profile,
      jobText: STEFANINI_REMOTE_BR_JOB,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    expect(explanation.blocked).toBe(true);
    expect(explanation.canPrepareManually).toBe(true);
    expect(explanation.items.some((item) => /contradição/i.test(item.label))).toBe(false);
    expect(explanation.summary).not.toMatch(/Remote locations:\s*Brazil/i);
    expect(explanation.items.every((item) => !/Remote locations:\s*Brazil/i.test(item.label))).toBe(true);
    // Brazil is already in the posting — do not claim the ad lacks geography.
    const locationItems = explanation.items.filter((item) => /localiza/i.test(item.label));
    for (const item of locationItems) {
      expect(item.kind).not.toBe("announcement");
      expect(item.detail?.toLowerCase() ?? "").not.toMatch(/falta.*localiza.*anúncio|ausente.*anúncio/);
    }
    expect(explanation.summary).not.toMatch(/\blocation\b|\bseniority\b/i);
  });

  it("Stefanini contraditório: oriente a verificar o modelo de trabalho (sem corrigir extração)", () => {
    const profile = thinProfile();
    const evidence = evidenceFromProfile(profile);
    expect(postingHasWorkModelContradiction(STEFANINI_CONTRADICTORY_JOB)).toBe(true);
    // Extraction preference (documented, out of scope to change): hybrid wins when both match.
    expect(extractJobIntelligence(STEFANINI_CONTRADICTORY_JOB).workModel).toBe("hybrid");

    const decision = evaluateJobDecisionV2({
      jobText: STEFANINI_CONTRADICTORY_JOB,
      evidence,
      profile,
      jobId: "job_fixture_stefanini_contradictory",
    });
    expect(decision.decision).toBe("needs_info");

    const explanation = explainPackBlock({
      decision,
      profile,
      jobText: STEFANINI_CONTRADICTORY_JOB,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    expect(explanation.blocked).toBe(true);
    const contradiction = explanation.items.find((item) => /contradição|modelo de trabalho/i.test(item.label));
    expect(contradiction?.kind).toBe("announcement");
    expect(explanation.summary.toLowerCase()).toMatch(/modelo de trabalho|anúncio|contradi/);
    expect(explanation.nextAction.toLowerCase()).toMatch(/anúncio/);
    expect(explanation.nextAction.toLowerCase()).not.toMatch(/edite o perfil para liberar/);
    expect(explanation.summary).not.toMatch(/\blocation\b|\bseniority\b|Work model:/i);
  });

  it("needs_info sem motivo estruturado usa orientação neutra", () => {
    const explanation = explainPackBlock({
      decision: {
        scoringVersion: "v2",
        decision: "needs_info",
        overall: 40,
        dimensions: {
          overall: 40,
          coreEngineering: 40,
          stack: 40,
          specialization: 40,
          seniority: 40,
          product: 40,
        },
        confidence: "low",
        hiringProbability: "low",
        careerUpside: "medium",
        applicationCost: "medium",
        opportunityCost: "medium",
        eliminationRisk: "medium",
        priority: 25,
        matches: [],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: [],
      },
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: false,
    });
    expect(explanation.blocked).toBe(true);
    expect(explanation.summary).toMatch(/motivo estruturado não veio completo|inconclusive/i);
    expect(explanation.nextAction.length).toBeGreaterThan(10);
    expect(explanation.title).toMatch(/indisponível/i);
  });

  it("vaga sem perfil/currículo classifica pendência de perfil com campo concreto", () => {
    const explanation = explainPackBlock({
      hasJobText: true,
      hasResume: false,
      hasSourceUrl: true,
      decision: null,
      pack: null,
    });
    expect(explanation.blocked).toBe(true);
    expect(explanation.items.some((item) => item.kind === "profile" && /currículo/i.test(item.label))).toBe(true);
    expect(explanation.summary.toLowerCase()).toMatch(/currículo|perfil/);
    expect(explanation.nextAction.toLowerCase()).toMatch(/perfil|currículo|manual/);
  });

  it("Stefanini-like: GCP/NestJS/Senioridade unknown são evidência, não 'complete no perfil'", () => {
    // Sanitized fixture mirroring prod QA observation (job_mwfici36): inconclusive
    // evidence reasons mislabeled as profile before the kind-copy fix.
    const profile = thinProfile();
    const evidenceReason = "Not enough recorded evidence to conclude proven, partial, or gap.";
    const explanation = explainPackBlock({
      decision: {
        scoringVersion: "v2",
        decision: "needs_info",
        overall: 48,
        dimensions: {
          overall: 48,
          coreEngineering: 55,
          stack: 45,
          specialization: 40,
          seniority: 40,
          product: 40,
        },
        confidence: "low",
        hiringProbability: "low",
        careerUpside: "medium",
        applicationCost: "medium",
        opportunityCost: "medium",
        eliminationRisk: "medium",
        priority: 35,
        matches: [
          {
            requirement: {
              id: "req-gcp",
              label: "GCP",
              category: "cloud",
              importance: "important",
              requirementType: "skill",
              skillHint: "GCP",
            },
            status: "unknown",
            matchedEvidence: [],
            reason: evidenceReason,
          },
          {
            requirement: {
              id: "req-nestjs",
              label: "NestJS",
              category: "backend",
              importance: "important",
              requirementType: "skill",
              skillHint: "NestJS",
            },
            status: "unknown",
            matchedEvidence: [],
            reason: evidenceReason,
          },
          {
            requirement: {
              id: "req-seniority",
              label: "Seniority: senior",
              category: "seniority",
              importance: "fundamental",
              requirementType: "experience",
              extractedText: "senior",
              qualifiers: ["senior"],
            },
            status: "unknown",
            matchedEvidence: [],
            reason: evidenceReason,
          },
        ],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: ["inconclusive matches"],
      },
      profile,
      jobText: STEFANINI_REMOTE_BR_JOB,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });

    expect(explanation.blocked).toBe(true);
    const gcp = explanation.items.find((item) => item.label === "GCP");
    const nest = explanation.items.find((item) => item.label === "NestJS");
    const seniority = explanation.items.find((item) => /Senioridade:\s*sênior/i.test(item.label));
    expect(gcp?.kind).toBe("evidence");
    expect(nest?.kind).toBe("evidence");
    expect(seniority?.kind).toBe("evidence");
    expect(explanation.title).toMatch(/evidência/i);
    expect(explanation.summary).toMatch(/Revise estes requisitos — a análise ficou inconclusiva no conjunto:/i);
    expect(explanation.summary).toMatch(/GCP/);
    expect(explanation.summary).toMatch(/NestJS/);
    expect(explanation.summary).toMatch(/Senioridade:\s*sênior/i);
    expect(explanation.summary).not.toMatch(/Complete no perfil ou no currículo:\s*GCP/i);
    expect(explanation.summary).not.toMatch(/adicione|complete no currículo/i);
    expect(explanation.nextAction).toMatch(/nenhum item listado, isoladamente/i);
    expect(gcp?.detail).not.toMatch(/Not enough recorded evidence/i);
    expect(humanizePackBlockDetail(evidenceReason)).toMatch(/evidência registrada/i);
    // V1-only unknowns are not V2 pack-block items here.
    expect(explanation.items.every((item) => !/^Express$|^JavaScript$/i.test(item.label))).toBe(true);
  });

  it("evidência parcial reconhece o que já existe e o que falta demonstrar", () => {
    const explanation = explainPackBlock({
      decision: {
        scoringVersion: "v2",
        decision: "needs_info",
        overall: 52,
        dimensions: {
          overall: 52,
          coreEngineering: 60,
          stack: 50,
          specialization: 45,
          seniority: 50,
          product: 40,
        },
        confidence: "low",
        hiringProbability: "low",
        careerUpside: "medium",
        applicationCost: "medium",
        opportunityCost: "medium",
        eliminationRisk: "medium",
        priority: 40,
        matches: [
          {
            requirement: {
              id: "req-nestjs-partial",
              label: "NestJS",
              category: "backend",
              importance: "important",
              requirementType: "skill",
              skillHint: "NestJS",
            },
            status: "partial",
            matchedEvidence: [],
            reason: "Node.js is recorded. That does not establish NestJS.",
          },
        ],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: ["partial evidence"],
      },
      profile: thinProfile(),
      jobText: STEFANINI_REMOTE_BR_JOB,
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    const nest = explanation.items.find((item) => item.label === "NestJS");
    expect(nest?.kind).toBe("evidence");
    expect(nest?.detail).toMatch(/Há evidência de Node\.js/i);
    expect(nest?.detail).toMatch(/ainda não demonstra NestJS/i);
    expect(explanation.summary).toMatch(/inconclusive no conjunto|requisitos/i);
    expect(explanation.summary).not.toMatch(/Complete no perfil/i);
  });

  it("não bloqueia quando decisão recomenda apply e pack não está blocked", () => {
    const explanation = explainPackBlock({
      decision: {
        scoringVersion: "v2",
        decision: "apply_normal",
        overall: 71,
        dimensions: {
          overall: 71,
          coreEngineering: 70,
          stack: 70,
          specialization: 70,
          seniority: 70,
          product: 70,
        },
        confidence: "medium",
        hiringProbability: "medium",
        careerUpside: "medium",
        applicationCost: "low",
        opportunityCost: "medium",
        eliminationRisk: "low",
        priority: 75,
        matches: [],
        claims: [],
        recommendedClaims: [],
        gates: [],
        candidateInputRequests: [],
        reasons: ["ok"],
      },
      hasJobText: true,
      hasResume: true,
      hasSourceUrl: true,
    });
    expect(explanation.blocked).toBe(false);
    expect(explanation.canPrepareManually).toBe(false);
  });
});
