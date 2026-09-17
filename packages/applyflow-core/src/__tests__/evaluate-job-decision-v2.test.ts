import { describe, expect, it } from "vitest";

import { auditClaim } from "../claim-safety.js";
import { gustavoProfile } from "../candidate-profile.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { gustavoEvidenceSeed } from "../evidence-seed.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { calculateFitScore } from "../fit-score.js";
import { parseApplyFlowApplicationsImport } from "../imported-application-schema.js";
import { coerceImportedApplicationStatus, fromPipelineStatusV2, toPipelineStatusV2 } from "../pipeline-status.js";
import { validateCandidateProfile } from "../profile-schema.js";

const NOW = new Date("2026-09-09T12:00:00.000Z");
const evidence = buildCandidateEvidence(gustavoProfile, gustavoEvidenceSeed, NOW);

const SENIOR_PRODUCT_ENGINEER = `
Senior Product Engineer — Remote SaaS

We need a Senior Product Engineer who owns discovery and delivery end-to-end.

Requirements:
- React, Next.js, TypeScript, Node.js
- PostgreSQL and product-oriented frontend architecture
- Ownership of 0-to-1 SaaS products
- Comfortable communicating in English

Nice to have:
- Tailwind, Playwright
`;

const PRODUCT_ENGINEER_AI = `
Product Engineer + AI — Remote

Core role is Product Engineer with React, Next.js, TypeScript and Node.js.
You will also help with AI features.

Requirements:
- Product engineer with ownership and SaaS experience
- React, Next.js, TypeScript, Node.js, PostgreSQL
- 3+ years architecting AWS
- Production GenAI / LLM system
- AI Agents

Nice to have:
- Kafka
`;

const SENIOR_PYTHON_BACKEND = `
Senior Python Backend Engineer

Requirements:
- 5+ years Python backend
- Senior Python backend ownership
- Distributed microservices
- Kafka
- 3+ years architecting AWS
- Production GenAI
- Vector database
`;

const SPARSE_JOB = `
Software opportunity at a growing company.
Experience with Elixir and Kubernetes is helpful.
Location and compensation to be discussed.
More details later.
`;

describe("extractJobRequirements", () => {
  it("preserva AWS + years + architecture em vez de colapsar para skill=AWS", () => {
    const reqs = extractJobRequirements("3+ years architecting AWS and Docker");
    const aws = reqs.find((item) => item.skillHint === "AWS" || /aws/i.test(item.label));
    expect(aws).toBeDefined();
    expect(aws?.minYears).toBe(3);
    expect(aws?.qualifiers).toContain("architecture");
    expect(aws?.category).toBe("cloud");
    expect(aws?.requirementType).toBe("years");
    expect(aws?.extractedText?.toLowerCase()).toContain("architecting aws");
  });
});

describe("evaluateJobDecisionV2 scenarios", () => {
  it("TEST 1: Senior Product Engineer aderente → APPLY_HIGH ou APPLY_NORMAL", () => {
    const result = evaluateJobDecisionV2({
      jobText: SENIOR_PRODUCT_ENGINEER,
      evidence,
      profile: gustavoProfile,
      jobId: "job_pe",
    });
    expect(["apply_high", "apply_normal"]).toContain(result.decision);
    expect(result.dimensions.coreEngineering).toBeGreaterThanOrEqual(70);
    expect(result.dimensions.product).toBeGreaterThanOrEqual(70);
    expect(result.dimensions.stack).toBeGreaterThanOrEqual(70);
    expect(result.recommendedClaims.every((item) => item.status !== "remove")).toBe(true);
    expect(result.scoringVersion).toBe("v2");
  });

  it("TEST 2: Product Engineer + AI com core alto e AI/AWS baixos → APPLY_STRETCH ou APPLY_NORMAL", () => {
    const result = evaluateJobDecisionV2({
      jobText: PRODUCT_ENGINEER_AI,
      evidence,
      profile: gustavoProfile,
      jobId: "job_pe_ai",
    });
    expect(["apply_stretch", "apply_normal"]).toContain(result.decision);
    expect(result.dimensions.coreEngineering).toBeGreaterThanOrEqual(70);
    expect(result.dimensions.ai ?? 0).toBeLessThan(55);
    expect(result.dimensions.cloud ?? 0).toBeLessThan(55);
    const aws = result.matches.find((item) => /aws/i.test(item.requirement.label));
    expect(aws?.status).not.toBe("proven");
    const agents = result.matches.find((item) => /agent/i.test(item.requirement.label));
    expect(agents?.status).not.toBe("proven");
  });

  it("TEST 3: Senior Python Backend sem equivalência → SKIP", () => {
    const result = evaluateJobDecisionV2({
      jobText: SENIOR_PYTHON_BACKEND,
      evidence,
      profile: gustavoProfile,
      claims: ["Senior Python Backend", "3+ years architecting AWS", "Production GenAI", "Python automation"],
      jobId: "job_py",
    });
    expect(result.decision).toBe("skip");
    expect(result.dimensions.specialization).toBeLessThan(55);
    expect(result.dimensions.cloud ?? 0).toBeLessThan(55);
    const python = result.matches.find((item) => /python backend/i.test(item.requirement.label));
    expect(python?.status).toBe("partial");
    expect(result.claims.find((item) => item.claim === "Senior Python Backend")?.status).toBe("remove");
    expect(result.claims.find((item) => item.claim === "Production GenAI")?.status).toBe("remove");
    expect(result.recommendedClaims.some((item) => item.claim === "Senior Python Backend")).toBe(false);
    expect(result.claims.find((item) => item.claim === "Python automation")?.status).not.toBe("remove");
  });

  it("TEST 4: vaga sem informação suficiente → UNKNOWN, inputs, sem inferências inventadas", () => {
    const result = evaluateJobDecisionV2({
      jobText: SPARSE_JOB,
      evidence,
      profile: gustavoProfile,
      jobId: "job_sparse",
    });
    const unknown = result.matches.filter((item) => item.status === "unknown");
    expect(result.confidence).toBe("low");
    expect(unknown.length).toBeGreaterThanOrEqual(2);
    expect(result.matches.every((item) => item.status !== "proven" || item.matchedEvidence.length > 0)).toBe(true);
    expect(result.matches.some((item) => /elixir|kubernetes/i.test(item.requirement.label) && item.status === "unknown")).toBe(
      true,
    );
    expect(result.matches.filter((item) => item.status === "gap")).toHaveLength(0);
    expect(result.candidateInputRequests.length).toBeGreaterThanOrEqual(2);
    expect(result.decision).toBe("needs_info");
    expect(result.reasons.join(" ")).toMatch(/Complete seu perfil para concluir a análise/i);
  });

  it("requisito de inglês sem dado no perfil fica UNKNOWN, não gap", () => {
    const sparse = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Product Engineer"],
      skills: { React: 2 },
    });
    const sparseEvidence = buildCandidateEvidence(sparse, [], NOW);
    const result = evaluateJobDecisionV2({
      jobText: SENIOR_PRODUCT_ENGINEER,
      evidence: sparseEvidence,
      profile: sparse,
      jobId: "job_unknown_en",
    });
    const english = result.matches.find((item) => /english/i.test(item.requirement.label));
    expect(english?.status).toBe("unknown");
    expect(result.matches.filter((item) => item.status === "gap" && /english/i.test(item.requirement.label))).toHaveLength(0);
    expect(result.gates.find((gate) => gate.type === "english")?.result).toBe("unknown");
  });

  it("perfil quase vazio não recebe APPLY forte só porque requisitos ficaram UNKNOWN", () => {
    const sparse = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Product Engineer"],
      skills: { React: null },
    });
    const sparseEvidence = buildCandidateEvidence(sparse, [], NOW);
    const result = evaluateJobDecisionV2({
      jobText: `Senior Product Engineer
Requirements:
- Fluent English required
- 5+ years of professional experience
- React
- TypeScript
You must have strong English communication and at least 5 years of experience.`,
      evidence: sparseEvidence,
      profile: sparse,
      jobId: "job_emptyish",
    });
    expect(result.matches.find((item) => /english/i.test(item.requirement.label))?.status).toBe("unknown");
    expect(result.matches.some((item) => item.status === "gap" && /english|seniority|typescript/i.test(item.requirement.label))).toBe(
      false,
    );
    expect(result.decision).toBe("needs_info");
    expect(result.reasons.join(" ")).toMatch(/Complete seu perfil para concluir a análise/i);
    expect(result.confidence).toBe("low");
  });
});

describe("claim safety", () => {
  it("distingue SAFE / DEFENSIBLE / REMOVE", () => {
    expect(auditClaim("React and TypeScript product engineering", evidence).status).toBe("safe");
    expect(auditClaim("Python automation", evidence).status).toMatch(/safe|defensible/);
    expect(auditClaim("Senior Python Backend", evidence).status).toBe("remove");
  });
});

describe("pipeline adapters", () => {
  it("mapeia V1 ↔ V2 sem perder o funil persistido", () => {
    expect(toPipelineStatusV2("reviewing")).toBe("qualified");
    expect(toPipelineStatusV2("ignored")).toBe("skipped");
    expect(fromPipelineStatusV2("found")).toBe("reviewing");
    expect(fromPipelineStatusV2("offer")).toBe("accepted");
    expect(coerceImportedApplicationStatus("qualified")).toBe("reviewing");
    expect(coerceImportedApplicationStatus("reviewing")).toBe("reviewing");
  });
});

describe("backward compatibility", () => {
  it("JSON antigo com status V1 continua válido", () => {
    const parsed = parseApplyFlowApplicationsImport([
      {
        id: "legacy-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: "reviewing",
        source: "linkedin",
      },
    ]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.applications[0]?.status).toBe("reviewing");
  });

  it("status V2 no import é adaptado para o funil V1", () => {
    const parsed = parseApplyFlowApplicationsImport([
      {
        id: "v2-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: "screening",
        source: "linkedin",
      },
    ]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.applications[0]?.status).toBe("interview");
  });

  it("calculateFitScore v1 continua disponível e determinístico", () => {
    const a = calculateFitScore("React TypeScript Next.js Node.js", gustavoProfile);
    const b = calculateFitScore("React TypeScript Next.js Node.js", gustavoProfile);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThan(0);
  });
});
