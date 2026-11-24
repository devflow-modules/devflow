import { describe, expect, it } from "vitest";

import { canCreateApplicationPack, createApplicationPack } from "../application-pack.js";
import { gustavoProfile } from "../candidate-profile.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { gustavoEvidenceSeed } from "../evidence-seed.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import type { Evidence } from "../evidence-types.js";
import { ingestApplyFlowJob } from "../ingest-applyflow-job.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";
import { createResumeLibraryFromProfile } from "../resume-library.js";

const NOW = new Date("2026-11-23T12:00:00.000Z");
const ISO = NOW.toISOString();

function ev(partial: Partial<Evidence> & Pick<Evidence, "id" | "label" | "description">): Evidence {
  return {
    subject: "skill",
    source: "resume",
    confidence: "verified",
    usableForClaims: true,
    createdAt: ISO,
    updatedAt: ISO,
    ...partial,
  };
}

const STACK_EVIDENCE: Evidence[] = [
  ev({
    id: "ev-react",
    label: "React",
    description: "Production React SPA delivery",
    technologies: ["React", "TypeScript"],
  }),
  ev({
    id: "ev-node",
    label: "Node.js",
    description: "Node.js APIs and SaaS integrations",
    technologies: ["Node.js", "TypeScript"],
  }),
  ev({
    id: "ev-ts",
    label: "TypeScript",
    description: "TypeScript across frontend and backend",
    technologies: ["TypeScript"],
  }),
];

const LLM_PRODUCTION_EVIDENCE: Evidence[] = [
  ev({
    id: "ev-llm-prod",
    subject: "project",
    label: "Customer-facing LLM assistant",
    description: "Shipped LLM-powered features to real users with OpenAI embeddings in production",
    technologies: ["LLM", "OpenAI", "Embeddings"],
  }),
];

const CURSOR_ONLY_EVIDENCE: Evidence[] = [
  ev({
    id: "ev-cursor",
    label: "Cursor and Claude Code",
    description: "Uses Cursor and Claude Code daily for coding assistance",
    technologies: ["Cursor"],
  }),
];

const GO_EVIDENCE: Evidence[] = [
  ev({
    id: "ev-go-period",
    subject: "experience",
    kind: "experience_period",
    label: "Go backend engineer",
    description: "6 years professional Go services",
    technologies: ["Go"],
    periodStart: "2019-01",
    periodEnd: "2025-01",
  }),
];

const ALTERNATIVE_PAYMENTS = `
Product Engineer — Alternative Payments (sanitized)
Remote - Latin America

Requirements:
- React, Node.js, TypeScript, SaaS integrations
- Hands-on experience delivering product features with LLMs
- Experience shipping AI-powered functionality to customers

Nice to have:
- Kafka
`;

const AE_STUDIO = `
Senior Software Engineer — AE Studio (sanitized)
Remote - Latin America

Requirements:
- Senior engineer with production-ready AI applications
- Practical experience with LLM APIs, embeddings, vector databases
- Implementing AI features and pipelines
- 5+ years of professional software development experience

Nice to have:
- Prompting and guardrails familiarity
`;

const SIENA_AI = `
Full-Stack Engineer — Siena AI (sanitized)
Remote - Latin America

Requirements:
- React, Node.js, TypeScript
- You've shipped LLM-powered features to real users. This is a must, not a bonus.
`;

const ALPACA_INTERNAL = `
Software Engineer — Alpaca Internal Tools (sanitized)
Remote - Latin America

Requirements:
- 5+ years of professional experience with Golang, C++, or Rust
- Building internal developer tools
- React familiarity is a plus
`;

const PASSIONFROOT = `
Full-Stack Engineer — Passionfroot (sanitized)

Hybrid role in Berlin or São Paulo. Relocation openness expected.
Strong collaboration across time zones.

Requirements:
- React, Next.js, TypeScript, Node.js
- PostgreSQL
`;

const NICE_AI_ONLY = `
Product Engineer
Remote - Latin America

Requirements:
- React, TypeScript, Node.js

Nice to have:
- Production GenAI / LLM system
- AI Agents
`;

const STAFF_JOB = `
Staff Software Engineer
Remote - Latin America

Requirements:
- Staff-level ownership across multiple teams
- React, TypeScript
`;

const PARTIAL_DESCRIPTION = `
Software Engineer
React TypeScript
More details later.
`;

function stackProfile() {
  return validateCandidateProfile({
    name: "Alex Candidate",
    roles: ["Product Engineer"],
    skills: { React: 6, TypeScript: 5, Nodejs: 6, PostgreSQL: 3, Nextjs: 3 },
    location: "Brazil",
    englishLevel: "Fluent",
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: { totalYearsExperience: 8, comfortableInEnglish: true },
  });
}

function stackEvidenceWithProfile(extra: readonly Evidence[] = []) {
  const profile = stackProfile();
  return {
    profile,
    evidence: [...buildCandidateEvidence(profile, [], NOW), ...STACK_EVIDENCE, ...extra],
  };
}

function evaluate(jobText: string, evidence: readonly Evidence[], profile = stackProfile()) {
  return evaluateJobDecisionV2({
    jobText,
    evidence: [...evidence],
    profile,
    jobId: "job_mandatory_fixture",
  });
}

describe("mandatory requirements sprint — extraction & equivalence", () => {
  it("1. LLM obrigatório sem evidência → unknown + needs_info (não apply_normal/high)", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(ALTERNATIVE_PAYMENTS, evidence, profile);
    const llm = result.matches.find((item) => item.requirement.category === "ai");
    expect(llm).toBeDefined();
    expect(llm?.requirement.mandatory || llm?.requirement.importance === "fundamental").toBe(true);
    expect(llm?.status).toBe("unknown");
    expect(["apply_normal", "apply_high"]).not.toContain(result.decision);
    expect(result.decision).toBe("needs_info");
    expect(result.overall).toBeGreaterThanOrEqual(55);
  });

  it("2. LLM obrigatório com evidência documentada → proven e pode aplicar", () => {
    const { profile, evidence } = stackEvidenceWithProfile(LLM_PRODUCTION_EVIDENCE);
    const result = evaluate(SIENA_AI, evidence, profile);
    const llm = result.matches.find((item) => /llm/i.test(item.requirement.label));
    expect(llm?.status).toBe("proven");
    expect(["apply_high", "apply_normal", "apply_stretch"]).toContain(result.decision);
  });

  it("3. IA apenas desejável ausente não é eliminatória", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(NICE_AI_ONLY, evidence, profile);
    const ai = result.matches.filter((item) => item.requirement.category === "ai");
    expect(ai.every((item) => item.requirement.importance === "nice_to_have")).toBe(true);
    expect(ai.every((item) => !item.requirement.mandatory)).toBe(true);
    expect(result.decision).not.toBe("skip");
    expect(["apply_high", "apply_normal", "apply_stretch"]).toContain(result.decision);
  });

  it("4. Uso de Cursor sem LLM em produção não comprova requisito de LLM", () => {
    const reqs = extractJobRequirements(SIENA_AI);
    const matches = matchRequirementsToEvidence(reqs, [...STACK_EVIDENCE, ...CURSOR_ONLY_EVIDENCE]);
    const llm = matches.find((item) => /llm/i.test(item.requirement.label));
    expect(llm?.status).not.toBe("proven");
    expect(llm?.status === "unknown" || llm?.status === "partial").toBe(true);
    if (llm?.status === "partial") {
      expect(llm.reason).toMatch(/coding assistants|not production LLM/i);
    }
  });

  it("5. Go/C++/Rust como alternativas obrigatórias sem evidência → unknown", () => {
    const reqs = extractJobRequirements(ALPACA_INTERNAL);
    const alt = reqs.find((item) => (item.alternatives?.length ?? 0) >= 2);
    expect(alt).toBeDefined();
    expect(alt?.alternatives).toEqual(expect.arrayContaining(["Go", "C++", "Rust"]));
    expect(alt?.minYears).toBe(5);
    expect(alt?.mandatory).toBe(true);
    const matches = matchRequirementsToEvidence(reqs, STACK_EVIDENCE);
    const hit = matches.find((item) => item.requirement.id === alt?.id);
    expect(hit?.status).toBe("unknown");
    expect(hit?.reason).toMatch(/not automatic substitutes/i);
  });

  it("6. Linguagem alternativa atendida (Go) satisfaz o grupo", () => {
    const reqs = extractJobRequirements(ALPACA_INTERNAL);
    const matches = matchRequirementsToEvidence(reqs, GO_EVIDENCE);
    const alt = matches.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2);
    expect(alt?.status).toBe("proven");
    expect(alt?.reason).toMatch(/Satisfied via Go/i);
  });

  it("7. Tempo mínimo explícito não demonstrado", () => {
    const shortGo: Evidence[] = [
      ev({
        id: "ev-go-short",
        subject: "experience",
        kind: "experience_period",
        label: "Go services",
        description: "Go microservices",
        technologies: ["Go"],
        periodStart: "2024-01",
        periodEnd: "2025-01",
      }),
    ];
    const reqs = extractJobRequirements(ALPACA_INTERNAL);
    const matches = matchRequirementsToEvidence(reqs, shortGo);
    const alt = matches.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2);
    expect(alt?.status === "gap" || alt?.status === "partial").toBe(true);
  });

  it("7b. Linguagem alternativa mencionada sem duração documentada permanece unknown", () => {
    const goMentionOnly: Evidence[] = [
      ev({
        id: "ev-go-mention",
        label: "Go",
        description: "Hobby Go scripts; duration not documented",
        technologies: ["Go"],
      }),
    ];
    const reqs = extractJobRequirements(ALPACA_INTERNAL);
    const matches = matchRequirementsToEvidence(reqs, goMentionOnly);
    const alt = matches.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2);
    expect(alt?.status).toBe("unknown");
    expect(alt?.reason).toMatch(/duration is not|stays unknown/i);
    const { profile } = stackEvidenceWithProfile();
    const result = evaluate(ALPACA_INTERNAL, goMentionOnly, profile);
    expect(result.decision).toBe("needs_info");
    expect(["apply_high", "apply_normal"]).not.toContain(result.decision);
  });

  it("7c. Phrase Kafka não duplica skill Kafka genérico", () => {
    const reqs = extractJobRequirements(ALTERNATIVE_PAYMENTS);
    const kafka = reqs.filter((item) => /kafka/i.test(item.label));
    expect(kafka).toHaveLength(1);
  });

  it("8. Tempo mínimo comprovado via Go", () => {
    const reqs = extractJobRequirements(ALPACA_INTERNAL);
    const matches = matchRequirementsToEvidence(reqs, GO_EVIDENCE);
    expect(matches.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2)?.status).toBe("proven");
  });

  it("9. Staff sem evidência de atuação Staff → não proven", () => {
    const result = evaluate(STAFF_JOB, STACK_EVIDENCE);
    const seniority = result.matches.find((item) => item.requirement.category === "seniority");
    expect(seniority).toBeDefined();
    expect(seniority?.status).not.toBe("proven");
  });

  it("10. Senior com experiência comprovada permanece coerente", () => {
    const evidence = buildCandidateEvidence(gustavoProfile, gustavoEvidenceSeed, NOW);
    const result = evaluateJobDecisionV2({
      jobText: `Senior Product Engineer — Remote - Brazil
Requirements:
- React, TypeScript, Node.js
- Comfortable communicating in English
`,
      evidence,
      profile: gustavoProfile,
      jobId: "job_senior_ok",
    });
    expect(["apply_high", "apply_normal", "apply_stretch"]).toContain(result.decision);
  });

  it("11. Elegibilidade geográfica desconhecida → needs_info sem mascarar score", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(PASSIONFROOT, evidence, profile);
    expect(result.eligibility?.status).toBe("unknown");
    expect(result.decision).toBe("needs_info");
    expect(result.overall).toBeGreaterThanOrEqual(70);
    expect(result.reasons.join(" ")).toMatch(/Elegibilidade|elegib/i);
  });

  it("12. Elegibilidade geográfica comprovadamente incompatível → skip", () => {
    const europe = validateCandidateProfile({
      ...stackProfile(),
      location: "Germany",
      name: "Alex Europe",
    });
    const result = evaluateJobDecisionV2({
      jobText: "Remote role based in Latin America only. React TypeScript Node.js.",
      evidence: STACK_EVIDENCE,
      profile: europe,
      jobId: "job_geo_ineligible",
    });
    expect(result.eligibility?.status).toBe("ineligible");
    expect(result.decision).toBe("skip");
  });

  it("13. Score alto com requisito eliminatório pendente → needs_info", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(SIENA_AI, evidence, profile);
    expect(result.overall).toBeGreaterThanOrEqual(50);
    expect(result.decision).toBe("needs_info");
    expect(result.matches.some((item) => item.requirement.category === "ai" && item.status === "unknown")).toBe(true);
  });

  it("14. Requisito técnico desconhecido permanece unknown (não gap)", () => {
    const reqs = extractJobRequirements("Requirements:\n- Elixir\n- React");
    const matches = matchRequirementsToEvidence(reqs, STACK_EVIDENCE);
    const elixir = matches.find((item) => /elixir/i.test(item.requirement.label));
    expect(elixir?.status).toBe("unknown");
  });

  it("14b. Falsos amigos: Docker ≠ Kubernetes e Node ≠ Go permanecem unknown", () => {
    const docker: Evidence[] = [
      ev({ id: "ev-docker", label: "Docker", description: "Docker containers for local dev", technologies: ["Docker"] }),
    ];
    const k8s = matchRequirementsToEvidence(extractJobRequirements("Requirements:\n- Kubernetes"), docker);
    expect(k8s.find((item) => /kubernetes/i.test(item.requirement.label))?.status).toBe("unknown");
    const go = matchRequirementsToEvidence(extractJobRequirements(ALPACA_INTERNAL), STACK_EVIDENCE);
    expect(go.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2)?.status).toBe("unknown");
  });

  it("15. Requisito explicitamente incompatível → gap", () => {
    const absent: Evidence[] = [
      ev({
        id: "ev-no-kafka",
        label: "Kafka",
        description: "No professional Kafka experience",
        technologies: ["Kafka"],
        usableForClaims: false,
        stance: "absent",
      }),
    ];
    const reqs = extractJobRequirements("Requirements:\n- Kafka (required)");
    const kafkaReq = reqs.find((item) => /kafka/i.test(item.label));
    expect(kafkaReq).toBeDefined();
    const forced = {
      ...kafkaReq!,
      mandatory: true,
      importance: "fundamental" as const,
    };
    const matches = matchRequirementsToEvidence([forced], absent);
    expect(matches[0]?.status).toBe("gap");
  });

  it("15b. Gap obrigatório de LLM não gera apply_normal/high", () => {
    const absentLlm: Evidence[] = [
      ...STACK_EVIDENCE,
      ev({
        id: "ev-no-llm",
        subject: "project",
        label: "Production LLM / GenAI system",
        description: "No production LLM, RAG, or GenAI system is recorded.",
        technologies: ["LLM"],
        usableForClaims: false,
        stance: "absent",
        confidence: "verified",
      }),
    ];
    const { profile } = stackEvidenceWithProfile();
    const result = evaluate(SIENA_AI, absentLlm, profile);
    const llm = result.matches.find((item) => /llm/i.test(item.requirement.label) && item.requirement.mandatory);
    expect(llm?.status).toBe("gap");
    expect(["apply_high", "apply_normal", "apply_stretch"]).not.toContain(result.decision);
    expect(result.decision).toBe("skip");
  });

  it("16. Anúncio com descrição parcial → confiança baixa / needs_info", () => {
    const result = evaluate(PARTIAL_DESCRIPTION, STACK_EVIDENCE);
    expect(result.confidence).toBe("low");
    expect(["needs_info", "apply_stretch", "apply_normal"]).toContain(result.decision);
  });

  it("17. Requisitos desejáveis ausentes não bloqueiam apply", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(NICE_AI_ONLY, evidence, profile);
    expect(result.matches.filter((item) => item.requirement.importance === "nice_to_have").length).toBeGreaterThan(0);
    expect(result.decision).not.toBe("skip");
    expect(["apply_high", "apply_normal", "apply_stretch"]).toContain(result.decision);
  });

  it("18. Repetição determinística da avaliação", () => {
    const a = evaluate(ALTERNATIVE_PAYMENTS, STACK_EVIDENCE);
    const b = evaluate(ALTERNATIVE_PAYMENTS, STACK_EVIDENCE);
    expect(b.decision).toBe(a.decision);
    expect(b.overall).toBe(a.overall);
    expect(b.matches.map((item) => `${item.requirement.id}:${item.status}`)).toEqual(
      a.matches.map((item) => `${item.requirement.id}:${item.status}`),
    );
  });

  it("19. Contratos V1 de decisão pública preservados", () => {
    const result = evaluate(ALTERNATIVE_PAYMENTS, STACK_EVIDENCE);
    expect(["apply_high", "apply_normal", "apply_stretch", "needs_info", "skip"]).toContain(result.decision);
    expect(result.scoringVersion).toBe("v2");
  });

  it("20. Fluxo manual de candidatura preservado (pack create path)", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { now: NOW, id: "rv_stack" });
    const job = ingestApplyFlowJob({
      description: `Senior Product Engineer
Remote - Brazil

We need React, Next.js, TypeScript and Node.js to ship product integrations.
`,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_manual_pack",
      url: "https://example.com/jobs/1",
    });
    expect(["apply", "stretch"]).toContain(job.jobMatch.decision);
    expect(canCreateApplicationPack(job, library)).toBe(true);
    const created = createApplicationPack({ job, library, now: NOW });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.job.applicationPack?.resume.variantId).toBeDefined();
    expect(created.job.status).toBe("reviewing");
  });
});

describe("mandatory requirements — real-shaped cases A–E", () => {
  it("A Alternative Payments — Node/React ≠ LLM; needs confirmation", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(ALTERNATIVE_PAYMENTS, evidence, profile);
    expect(result.decision).toBe("needs_info");
    expect(result.candidateInputRequests.some((item) => /LLM|IA generativa/i.test(item.question))).toBe(true);
  });

  it("B AE Studio — embeddings/LLM APIs obrigatórios sem evidência", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(AE_STUDIO, evidence, profile);
    const ai = result.matches.filter((item) => item.requirement.category === "ai");
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.some((item) => item.status === "unknown")).toBe(true);
    expect(["apply_normal", "apply_high"]).not.toContain(result.decision);
  });

  it("C Siena AI — must-not-bonus LLM impede apply incondicional", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(SIENA_AI, evidence, profile);
    const llm = result.matches.find((item) => /llm/i.test(item.requirement.label));
    expect(llm?.requirement.mandatory).toBe(true);
    expect(result.decision).toBe("needs_info");
    expect(result.dimensions.stack).toBeGreaterThanOrEqual(60);
  });

  it("D Alpaca Internal — Go/C++/Rust group; Node não substitui", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(ALPACA_INTERNAL, evidence, profile);
    const alt = result.matches.find((item) => (item.requirement.alternatives?.length ?? 0) >= 2);
    expect(alt?.status).toBe("unknown");
    expect(["apply_normal", "apply_high"]).not.toContain(result.decision);
  });

  it("E Passionfroot — score técnico alto com elegibilidade unknown", () => {
    const { profile, evidence } = stackEvidenceWithProfile();
    const result = evaluate(PASSIONFROOT, evidence, profile);
    expect(result.overall).toBeGreaterThanOrEqual(70);
    expect(result.eligibility?.status).toBe("unknown");
    expect(result.decision).toBe("needs_info");
  });
});
