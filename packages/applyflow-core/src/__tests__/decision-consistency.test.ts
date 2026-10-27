import { describe, expect, it } from "vitest";

import { createApplicationPackV2, evaluateJobApplicationV2, type ApplicationPackV2 } from "../application-pack-v2.js";
import { deriveApplicationReadiness } from "../application-readiness.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import type { Evidence } from "../evidence-types.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import type { ApplyFlowJob } from "../job-match-types.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile, type AnswerBank, type CandidateProfile } from "../profile-schema.js";
import { addResumeVariant, createResumeLibraryFromProfile, getDefaultResumeVariant } from "../resume-library.js";
import type { ResumeLibrary } from "../resume-library-types.js";

const NOW = new Date("2026-10-27T15:00:00.000Z");
const STAMP = NOW.toISOString();
const STACK = "React, Next.js, TypeScript and Node.js. Minimum 5 years.";
const ENGLISH_JOB = `We are looking for a Senior Software Engineer to build and maintain our SaaS platform. Remote - Brazil. ${STACK}`;
const ENGLISH_POSTGRES_JOB = `We are looking for a Senior Software Engineer. Remote - Brazil. PostgreSQL. ${STACK}`;
const PORTUGUESE_JOB = `Buscamos uma pessoa desenvolvedora sênior para atuar na evolução de nossos produtos digitais. Remote - Brazil. ${STACK}`;
const US_ONLY = `We are looking for a Senior Software Engineer to build and maintain our SaaS platform. Remote - United States only. Applicants must reside in the United States. ${STACK}`;

const PROSPECTA_PT: Evidence = {
  id: "ev-prospecta-pt",
  label: "Prospecta",
  project: "Prospecta",
  description: "Authenticated machine-to-machine ingestion on PostgreSQL with idempotent, duplicate-safe processing.",
  technologies: ["PostgreSQL"],
  subject: "project",
  source: "resume",
  confidence: "strong",
  usableForClaims: true,
  createdAt: STAMP,
  updatedAt: STAMP,
};

function bank(language: "en" | "pt", overrides: Partial<AnswerBank> = {}): AnswerBank {
  const prefix = language === "en" ? "EN" : "PT";
  return {
    ...EMPTY_ANSWER_BANK,
    tellUsAboutYourself: `${prefix} intro: production products with React and TypeScript.`,
    whyGoodFit: `${prefix} fit: React and TypeScript product work.`,
    productCase: `${prefix} product case: shipped a React and TypeScript platform.`,
    frontendCase: `${prefix} frontend case: React and TypeScript interfaces.`,
    backendCase: `${prefix} backend case: Node.js and TypeScript services.`,
    ...overrides,
  };
}

function person(input: {
  language: "en" | "pt";
  skills?: Record<string, number>;
  evidence?: Evidence[];
  answers?: Partial<AnswerBank>;
}): CandidateProfile {
  return validateCandidateProfile({
    name: "Candidato Sintético",
    location: "Santos, SP, Brazil",
    englishLevel: "Advanced",
    roles: ["Senior Full Stack Engineer"],
    skills: input.skills ?? { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6 },
    salary: { cltSenior: "R$ 10.000/mês", pjSenior: "R$ 12.000/mês", usdMonthly: "USD 3,000/month" },
    facts: {
      location: "Santos, SP, Brazil",
      totalYearsExperience: 6,
      remotePreference: "remote",
      englishLevel: "Advanced",
    },
    answerBank: bank(input.language, input.answers),
    evidence: input.evidence ?? [],
  });
}

function library(pt: CandidateProfile, en: CandidateProfile): ResumeLibrary {
  const seeded = createResumeLibraryFromProfile(pt, { now: NOW, id: "rv_pt", name: "CV ATS PT-BR 2026" });
  const added = addResumeVariant(seeded, { profile: en, name: "CV ATS EN 2026", id: "rv_en", now: NOW });
  if (!added.ok) throw new Error(added.error);
  return added.library;
}

/** Mirrors the dashboard: the caller starts from the library default variant. */
function evaluate(jobText: string, lib: ResumeLibrary) {
  const profile = getDefaultResumeVariant(lib).profile;
  return evaluateJobApplicationV2({
    jobId: "job_i20",
    jobText,
    jobTitle: "Senior Software Engineer",
    companyName: "Example Co",
    source: "paste",
    profile,
    evidence: buildCandidateEvidence(profile, [], NOW),
    resumeLibrary: lib,
    now: NOW,
  });
}

function variantEvidenceIds(lib: ResumeLibrary, id: string): Set<string> {
  const variant = lib.variants.find((item) => item.id === id);
  if (!variant) throw new Error(`missing variant ${id}`);
  return new Set(buildCandidateEvidence(variant.profile, [], NOW).map((item) => item.id));
}

function usedEvidenceIds(pack: ApplicationPackV2, decisionMatches: { matchedEvidence: Evidence[] }[]): string[] {
  return [
    ...decisionMatches.flatMap((item) => item.matchedEvidence.map((ev) => ev.id)),
    ...pack.claimAudit.finalSafe.flatMap((item) => item.supportingEvidence.map((ev) => ev.id)),
  ];
}

function applicantText(pack: ApplicationPackV2): string {
  return [
    ...pack.applicationAnswers.map((item) => item.recommendedAnswer ?? ""),
    ...(pack.cvPersonalization?.experienceChanges ?? []).map((item) => item.proposed),
    ...pack.claimAudit.finalSafe.map((item) => item.claim),
  ].join("\n");
}

function job(descriptionSnapshot: string): ApplyFlowJob {
  return {
    id: "job_i20",
    title: "Senior Software Engineer",
    company: "Example Co",
    url: "https://jobs.example/i20",
    source: "paste",
    status: "reviewing",
    descriptionSnapshot,
    jobContext: { skills: ["React", "TypeScript"] },
    jobMatch: {
      score: 90,
      decision: "apply",
      matchedSkills: ["React", "TypeScript"],
      missingSkills: [],
      evaluatedAt: STAMP,
      scoringVersion: "v1",
    },
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

describe("I20 decision consistency across resume routing", () => {
  it("I20C keeps the stronger PT resume but requires language confirmation instead of an unconditional ready", () => {
    const pt = person({ language: "pt", skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 } });
    const en = person({ language: "en" });
    const lib = library(pt, en);
    const { decision, pack } = evaluate(ENGLISH_POSTGRES_JOB, lib);

    expect(pack.resumeRecommendation?.variant.id).toBe("rv_pt");
    expect(pack.resumeRecommendation?.requiresLanguageConfirmation).toBe(true);
    expect(pack.status).toBe("needs_confirmation");
    expect(pack.status).not.toBe("ready");
    expect(pack.confirmations?.[0]?.id).toBe("resume_language");
    expect(pack.confirmations?.[0]?.jobLanguage).toBe("en");
    expect(pack.confirmations?.[0]?.resumeLanguage).toBe("pt-BR");
    expect(pack.reason).toMatch(/inglês/);
    expect(pack.reason).toMatch(/nenhuma tradução/i);
    expect(pack.resumeRecommendation?.reason).toMatch(/Technical fit favors/);
    expect(pack.candidateInputs.some((item) => item.id === "resume-language-job_i20" && item.status === "pending")).toBe(true);

    expect(decision).toBe(pack.evaluation);
    expect(pack.evaluatedResumeVariantId).toBe("rv_pt");
    const ptIds = variantEvidenceIds(lib, "rv_pt");
    for (const id of usedEvidenceIds(pack, decision.matches)) expect(ptIds.has(id)).toBe(true);

    const readiness = deriveApplicationReadiness({ job: job(ENGLISH_POSTGRES_JOB), resumeLibrary: lib, pack });
    const packItem = readiness.items.find((item) => item.id === "pack");
    expect(packItem?.state).toBe("attention");
    expect(packItem?.reason).toBe("language_confirmation_required");
    expect(readiness.items.every((item) => item.state === "ready")).toBe(false);
  });

  it("I20D uses only the selected EN resume's evidence when PT has extra project evidence", () => {
    const pt = person({ language: "pt", evidence: [PROSPECTA_PT] });
    const en = person({ language: "en" });
    const lib = library(pt, en);
    const { decision, pack } = evaluate(ENGLISH_POSTGRES_JOB, lib);

    expect(pack.evaluatedResumeVariantId).toBe("rv_en");
    expect(decision.decision).toBe("needs_info");
    expect(pack.status).toBe("blocked");
    expect(decision).toBe(pack.evaluation);
    const used = usedEvidenceIds(pack, decision.matches);
    expect(used).not.toContain("ev-prospecta-pt");
    const enIds = variantEvidenceIds(lib, "rv_en");
    for (const id of used) expect(enIds.has(id)).toBe(true);

    const postgres = decision.matches.filter((item) => /postgres/i.test(item.requirement.label));
    expect(postgres.length).toBeGreaterThan(0);
    for (const item of postgres) expect(item.status).not.toBe("proven");
    expect(applicantText(pack)).not.toMatch(/Prospecta/);
    expect(applicantText(pack)).not.toMatch(/PT /);
  });

  it("I20D also re-scopes a caller decision computed with the PT default resume", () => {
    const pt = person({ language: "pt", evidence: [PROSPECTA_PT] });
    const en = person({ language: "en" });
    const lib = library(pt, en);
    const callerEvidence = buildCandidateEvidence(pt, [], NOW);
    const callerDecision = evaluateJobDecisionV2({ jobText: ENGLISH_POSTGRES_JOB, evidence: callerEvidence, profile: pt, jobId: "job_i20" });
    expect(callerDecision.matches.some((item) => item.matchedEvidence.some((ev) => ev.id === "ev-prospecta-pt"))).toBe(true);

    const pack = createApplicationPackV2({
      jobId: "job_i20",
      jobText: ENGLISH_POSTGRES_JOB,
      profile: pt,
      evidence: callerEvidence,
      decision: callerDecision,
      resumeLibrary: lib,
      now: NOW,
    });
    expect(callerDecision.decision).toBe("apply_normal");
    expect(pack.evaluatedResumeVariantId).toBe("rv_en");
    expect(pack.evaluation).not.toBe(callerDecision);
    expect(pack.evaluation?.decision).toBe("needs_info");
    expect(pack.status).toBe("blocked");
    expect(pack.evaluation?.matches.some((item) => item.matchedEvidence.some((ev) => ev.id === "ev-prospecta-pt"))).toBe(false);
  });

  it("I20E selects PT for a Portuguese posting without a language warning", () => {
    const lib = library(person({ language: "pt" }), person({ language: "en" }));
    const { decision, pack } = evaluate(PORTUGUESE_JOB, lib);
    expect(pack.resumeRecommendation?.variant.id).toBe("rv_pt");
    expect(pack.resumeRecommendation?.requiresLanguageConfirmation).toBe(false);
    expect(pack.status).toBe("ready");
    expect(pack.confirmations).toEqual([]);
    expect(pack.candidateInputs.some((item) => item.id.startsWith("resume-language-"))).toBe(false);
    const ptIds = variantEvidenceIds(lib, "rv_pt");
    for (const id of usedEvidenceIds(pack, decision.matches)) expect(ptIds.has(id)).toBe(true);
    expect(applicantText(pack)).toMatch(/PT intro/);
  });

  it("I20F keeps a US-only job blocked regardless of resume routing", () => {
    const pt = person({ language: "pt", skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 } });
    const lib = library(pt, person({ language: "en" }));
    const { decision, pack } = evaluate(US_ONLY, lib);
    expect(decision.eligibility?.status).toBe("ineligible");
    expect(decision.decision).toBe("skip");
    expect(pack.status).toBe("blocked");
    expect(pack.applicationAnswers).toHaveLength(0);
    expect(pack.resumeRecommendation).toBeUndefined();

    const readiness = deriveApplicationReadiness({ job: job(US_ONLY), resumeLibrary: lib, pack });
    expect(readiness.items.find((item) => item.id === "pack")?.state).toBe("missing");
    expect(readiness.items.find((item) => item.id === "gaps")?.reason).toBe("ineligible");
  });

  it("I20G removes an invented metric, keeps applicant text clean and discloses the removal", () => {
    const en = person({
      language: "en",
      answers: { productCase: "EN product case: shipped a React and TypeScript platform. It increased conversion by 40%." },
    });
    const lib = library(person({ language: "pt" }), en);
    const { pack } = evaluate(ENGLISH_JOB, lib);
    expect(pack.resumeRecommendation?.variant.id).toBe("rv_en");
    expect(applicantText(pack)).not.toMatch(/40%/);
    const removed = pack.claimAudit.claims.filter((item) => item.status === "remove").map((item) => item.claim);
    expect(removed.some((claim) => /40%/.test(claim))).toBe(true);
    expect(pack.claimAudit.finalSafe.some((item) => /40%/.test(item.claim))).toBe(false);
    expect(pack.claimHandling?.removedMaterial.some((claim) => /40%/.test(claim))).toBe(true);
    expect(pack.claimHandling?.unsafeInOutput).toEqual([]);

    const readiness = deriveApplicationReadiness({ job: job(ENGLISH_JOB), resumeLibrary: lib, pack });
    const claims = readiness.items.find((item) => item.id === "claims");
    expect(claims?.reason).toBe("material_claims_removed");
    expect(claims?.state).toBe("ready");
  });

  it("I20H leaves unknown salary unknown without a hard rejection or invented target", () => {
    const lib = library(person({ language: "pt" }), person({ language: "en" }));
    const { decision, pack } = evaluate(ENGLISH_JOB, lib);
    expect(pack.compensation?.compatibility).toBe("unknown");
    expect(pack.compensation?.target).toBeUndefined();
    expect(decision.decision).not.toBe("skip");
    expect(decision.gates.find((item) => item.type === "salary")?.result).not.toBe("fail");
  });

  it("I20J preserves the EN resume, answers and evidence for equivalent variants", () => {
    const lib = library(person({ language: "pt" }), person({ language: "en" }));
    const { decision, pack } = evaluate(ENGLISH_JOB, lib);
    expect(pack.resumeRecommendation?.variant.id).toBe("rv_en");
    expect(pack.resumeRecommendation?.requiresLanguageConfirmation).toBe(false);
    expect(pack.status).toBe("ready");
    expect(decision).toBe(pack.evaluation);
    const enIds = variantEvidenceIds(lib, "rv_en");
    for (const id of usedEvidenceIds(pack, decision.matches)) expect(enIds.has(id)).toBe(true);
    const text = applicantText(pack);
    expect(text).toMatch(/EN intro/);
    expect(text).not.toMatch(/PT intro/);

    const readiness = deriveApplicationReadiness({ job: job(ENGLISH_JOB), resumeLibrary: lib, pack });
    expect(readiness.items.find((item) => item.id === "pack")?.reason).toBe("pack_ready");
  });
});

describe("readiness claim handling", () => {
  const lib = library(person({ language: "pt" }), person({ language: "en" }));
  const base = evaluate(ENGLISH_JOB, lib).pack;

  function withHandling(handling: NonNullable<ApplicationPackV2["claimHandling"]>): ApplicationPackV2 {
    return { ...base, claimHandling: handling };
  }

  it("blocks readiness when a removed claim still appears in applicant-facing text", () => {
    const readiness = deriveApplicationReadiness({
      job: job(ENGLISH_JOB),
      resumeLibrary: lib,
      pack: withHandling({ removedMaterial: ["I managed 20 engineers."], removedOptional: [], unsafeInOutput: ["I managed 20 engineers."] }),
    });
    const claims = readiness.items.find((item) => item.id === "claims");
    expect(claims?.state).toBe("missing");
    expect(claims?.reason).toBe("unsafe_claim_present");
  });

  it("does not block readiness for a removed optional claim", () => {
    const readiness = deriveApplicationReadiness({
      job: job(ENGLISH_JOB),
      resumeLibrary: lib,
      pack: withHandling({ removedMaterial: [], removedOptional: ["I enjoy hiking on weekends."], unsafeInOutput: [] }),
    });
    const claims = readiness.items.find((item) => item.id === "claims");
    expect(claims?.state).toBe("ready");
    expect(claims?.reason).toBe("optional_claims_removed");
  });

  it("keeps an unknown hard requirement under confirmation", () => {
    const evaluation = base.evaluation!;
    const [first, ...rest] = evaluation.matches;
    const pack: ApplicationPackV2 = {
      ...base,
      evaluation: {
        ...evaluation,
        matches: [
          { ...first!, status: "unknown", matchedEvidence: [], requirement: { ...first!.requirement, mandatory: true, label: "Security clearance" } },
          ...rest,
        ],
      },
    };
    const item = deriveApplicationReadiness({ job: job(ENGLISH_JOB), resumeLibrary: lib, pack }).items.find((entry) => entry.id === "pack");
    expect(item?.state).toBe("attention");
    expect(item?.reason).toBe("unknown_hard_requirement");
    expect(item?.detail).toMatch(/Security clearance/);
  });

  it("keeps the previous checklist when no pack is provided", () => {
    const readiness = deriveApplicationReadiness({ job: job(ENGLISH_JOB), resumeLibrary: lib });
    expect(readiness.items.some((item) => item.id === "pack" || item.id === "claims")).toBe(false);
  });
});
