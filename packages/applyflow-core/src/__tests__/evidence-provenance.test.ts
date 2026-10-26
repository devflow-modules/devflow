import { describe, expect, it } from "vitest";

import { createApplicationPackV2 } from "../application-pack-v2.js";
import { auditClaim } from "../claim-safety.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import { deriveEvidencePassages, explainProvenance } from "../evidence-provenance.js";
import type { Evidence } from "../evidence-types.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import type { JobRequirement } from "../job-requirement-types.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile, type AnswerBank, type CandidateProfile } from "../profile-schema.js";
import { addResumeVariant, createResumeLibraryFromProfile } from "../resume-library.js";
import { recommendResumeV2 } from "../resume-router-v2.js";

const NOW = new Date("2026-10-26T16:00:00.000Z");
const STAMP = NOW.toISOString();
const STACK = "React, Next.js, TypeScript and Node.js. Minimum 5 years.";
const ENGLISH_JOB = `We are looking for a Senior Software Engineer to build and maintain our SaaS platform. Remote - Brazil. ${STACK}`;
const PORTUGUESE_JOB = `Buscamos uma pessoa desenvolvedora sênior para atuar na evolução de nossos produtos digitais. Remote - Brazil. ${STACK}`;
const US_ONLY = `We are looking for a Senior Software Engineer to build and maintain our SaaS platform. Remote - United States only. Applicants must reside in the United States. ${STACK}`;
const ONSITE = `Senior Software Engineer. Onsite in São Paulo. ${STACK} Minimum 5 years.`;

function evidence(partial: Pick<Evidence, "id" | "label" | "description"> & Partial<Evidence>): Evidence {
  return {
    subject: "project",
    source: "resume",
    confidence: "strong",
    usableForClaims: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
  };
}

function req(partial: Pick<JobRequirement, "id" | "label"> & Partial<JobRequirement>): JobRequirement {
  return { category: "backend", importance: "important", requirementType: "experience", ...partial };
}

const PROSPECTA = evidence({
  id: "ev-prospecta",
  label: "Prospecta",
  project: "Prospecta",
  description: "Authenticated machine-to-machine ingestion with idempotent, duplicate-safe processing.",
});
const WHATSAPP = evidence({
  id: "ev-whatsapp",
  label: "WhatsApp Platform",
  project: "WhatsApp Platform",
  description: "HMAC webhook verification, multi-agent inbox, and send-ledger safeguards.",
});
const APPLYFLOW = evidence({
  id: "ev-applyflow",
  label: "ApplyFlow",
  project: "ApplyFlow",
  description: "Local-first SaaS product ownership, deterministic matching, and account-scoped persistence. No revenue or conversion figure is recorded.",
});
const BRAZA = evidence({
  id: "ev-braza",
  label: "Na Braza",
  project: "Na Braza",
  description: "Customer-facing digital menu and checkout, with iFood command deduplication and event-confirmed status transitions.",
});
const AGGREGATE = evidence({
  id: "ev-devflow",
  label: "DevFlow products",
  description: [
    "ApplyFlow — local-first architecture, deterministic matching, and PostgreSQL multi-tenancy.",
    "Prospecta — authenticated ingestion with idempotent processing.",
    "WhatsApp Platform — HMAC webhooks and a multi-agent inbox.",
    "Na Braza — digital menu, checkout, and iFood command deduplication.",
  ].join("\n"),
});
const AMBIGUOUS = evidence({
  id: "ev-ambiguous",
  label: "Several products",
  description: "Work spanned ApplyFlow, Prospecta, WhatsApp Platform, and Na Braza, including idempotent ingestion, without separating the contribution.",
});

function bank(language: "en" | "pt"): AnswerBank {
  const prefix = language === "en" ? "EN" : "PT";
  return {
    ...EMPTY_ANSWER_BANK,
    tellUsAboutYourself: `${prefix} intro: production products with React and TypeScript.`,
    whyGoodFit: `${prefix} fit: React and TypeScript product work.`,
    availability: `${prefix} availability: can start React and TypeScript work.`,
    productCase: `${prefix} product case: shipped a React and TypeScript platform.`,
    frontendCase: `${prefix} frontend case: React and TypeScript interfaces.`,
    backendCase:
      language === "en"
        ? "EN backend case: Prospecta authenticated ingestion with idempotent processing."
        : "PT backend case: Prospecta com ingestao idempotente e retentativas limitadas de callback.",
  };
}

function person(language: "en" | "pt", records: Evidence[]): CandidateProfile {
  return validateCandidateProfile({
    name: "Candidato",
    location: "Santos, SP, Brazil",
    englishLevel: "Advanced",
    roles: ["Senior Full Stack Engineer"],
    skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 },
    salary: { cltSenior: "R$ 10.000/mês", pjSenior: "R$ 12.000/mês", usdMonthly: "USD 3,000/month" },
    facts: {
      location: "Santos, SP, Brazil",
      totalYearsExperience: 6,
      remotePreference: "remote",
      englishLevel: "Advanced",
    },
    answerBank: bank(language),
    evidence: records,
  });
}

function libraryFor(enEvidence: Evidence[], ptEvidence: Evidence[]) {
  const pt = person("pt", ptEvidence);
  const en = person("en", enEvidence);
  const seeded = createResumeLibraryFromProfile(pt, { now: NOW, id: "rv_pt", name: "CV ATS PT-BR 2026" });
  const added = addResumeVariant(seeded, { profile: en, name: "CV ATS EN 2026", id: "rv_en", now: NOW });
  if (!added.ok) throw new Error(added.error);
  return { library: added.library, pt, en };
}

function packFor(jobText: string, enEvidence: Evidence[], ptEvidence: Evidence[]) {
  const { library, pt } = libraryFor(enEvidence, ptEvidence);
  const evidence = buildCandidateEvidence(pt, [], NOW);
  const decision = evaluateJobDecisionV2({ jobText, evidence, profile: pt, jobId: "job_p4" });
  return createApplicationPackV2({
    jobId: "job_p4",
    jobText,
    profile: pt,
    evidence,
    decision,
    resumeLibrary: library,
    now: NOW,
  });
}

describe("project provenance", () => {
  it("P1 attributes idempotent ingestion to Prospecta", () => {
    const [match] = matchRequirementsToEvidence([req({ id: "idem", label: "Idempotent backend ingestion" })], [PROSPECTA, WHATSAPP]);
    expect(match?.status).toBe("proven");
    expect(match?.provenance?.projectName).toBe("Prospecta");
    expect(match?.provenance?.evidenceId).toBe("ev-prospecta");
    expect(match?.matchedEvidence[0]?.id).toBe("ev-prospecta");
    expect(explainProvenance(match!.provenance!)).toMatch(/Prospecta/);
  });

  it("P2 does not substitute Prospecta for a WhatsApp webhook", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "hook", label: "Webhook security and messaging integrations" })],
      [PROSPECTA, WHATSAPP],
    );
    expect(match?.provenance?.projectName).toBe("WhatsApp Platform");
    expect(match?.provenance?.evidenceId).toBe("ev-whatsapp");
    expect(match?.matchedEvidence.map((item) => item.id)).not.toContain("ev-prospecta");
  });

  it("P3 uses ApplyFlow product evidence without a revenue claim", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "product", label: "End-to-end SaaS product ownership", category: "product" })],
      [APPLYFLOW, PROSPECTA],
    );
    expect(match?.provenance?.projectName).toBe("ApplyFlow");
    const audited = auditClaim("ApplyFlow increased conversion by 40%.", [APPLYFLOW]);
    expect(audited.status).toBe("remove");
    expect(audited.reason).toMatch(/measured/i);
  });

  it("P4 attributes the customer workflow to Na Braza", () => {
    const [match] = matchRequirementsToEvidence(
      [req({ id: "order", label: "Customer-facing transactional checkout workflow" })],
      [BRAZA, APPLYFLOW],
    );
    expect(match?.provenance?.projectName).toBe("Na Braza");
    expect(match?.provenance?.sourceText).toMatch(/iFood/);
  });

  it("P5 attributes only the passage that supports the requirement", () => {
    const passages = deriveEvidencePassages(AGGREGATE);
    expect(passages.map((item) => item.projectName)).toEqual(["ApplyFlow", "Prospecta", "WhatsApp Platform", "Na Braza"]);
    const [match] = matchRequirementsToEvidence([req({ id: "idem", label: "Idempotent backend ingestion" })], [AGGREGATE]);
    expect(match?.provenance?.evidenceId).toBe("ev-devflow");
    expect(match?.provenance?.projectName).toBe("Prospecta");
    expect(match?.provenance?.sourceText).toMatch(/idempotent/);
    expect(match?.provenance?.sourceText).not.toMatch(/iFood/);
  });

  it("P6 does not invent a project for an unscoped list", () => {
    const [passage] = deriveEvidencePassages(AMBIGUOUS);
    expect(passage?.ambiguous).toBe(true);
    expect(passage?.projectName).toBeUndefined();
    const [match] = matchRequirementsToEvidence([req({ id: "idem", label: "Idempotent backend ingestion" })], [AMBIGUOUS]);
    expect(match?.status).not.toBe("proven");
    expect(match?.provenance?.projectName).toBeUndefined();
    const attributed = auditClaim("I built idempotent ingestion in Prospecta.", [AMBIGUOUS]);
    expect(attributed.status).toBe("remove");
  });

  it("P7 rejects an unsupported conversion metric", () => {
    const audited = auditClaim("I increased conversion by 40%.", [APPLYFLOW]);
    expect(audited.status).toBe("remove");
  });

  it("P8 rejects a management headcount inferred from ownership", () => {
    const founder = evidence({
      id: "ev-founder",
      subject: "experience",
      label: "Founder and product engineer",
      description: "Owns 0-to-1 products. Not a people-manager title.",
    });
    const audited = auditClaim("I managed 20 engineers.", [founder]);
    expect(audited.status).toBe("remove");
    expect(audited.reason).toMatch(/management|people/i);
  });

  it("P9 does not treat ReceitaWS as AWS", () => {
    const receita = evidence({
      id: "ev-receita",
      subject: "skill",
      label: "ReceitaWS lookup",
      description: "Integrated ReceitaWS for CNPJ lookup.",
      technologies: ["ReceitaWS"],
    });
    const [match] = matchRequirementsToEvidence(
      [req({ id: "aws", label: "AWS", skillHint: "AWS", category: "cloud", requirementType: "skill" })],
      [receita],
    );
    expect(match?.status).not.toBe("proven");
    const audited = auditClaim("I have production AWS architecture experience.", [receita]);
    expect(audited.status).toBe("remove");
  });

  it("P10 does not treat JavaScript as Java", () => {
    const javascript = evidence({
      id: "ev-js",
      subject: "skill",
      label: "JavaScript",
      description: "Professional JavaScript in the browser.",
      technologies: ["JavaScript"],
    });
    const [match] = matchRequirementsToEvidence(
      [req({ id: "java", label: "Java", skillHint: "Java", requirementType: "skill" })],
      [javascript],
    );
    expect(match?.status).not.toBe("proven");
    const audited = auditClaim("I have professional Java experience.", [javascript]);
    expect(audited.status).toBe("remove");
  });
});

describe("resume evidence isolation", () => {
  const enOnly = [PROSPECTA];
  const ptExtra = [
    evidence({
      ...PROSPECTA,
      description: "Ingestao autenticada e idempotente, com retentativas limitadas de callback.",
    }),
  ];

  it("V1 uses the English resume, answers, and evidence", () => {
    const result = packFor(ENGLISH_JOB, enOnly, ptExtra);
    expect(result.status).toBe("ready");
    expect(result.resumeRecommendation?.variant.name).toBe("CV ATS EN 2026");
    expect(result.resumeRecommendation?.variant.profile.evidence?.[0]?.description).toMatch(/idempotent/);
    const text = result.applicationAnswers.map((item) => item.recommendedAnswer ?? "").join("\n");
    expect(text).toMatch(/EN intro/);
    expect(text).not.toMatch(/retentativas/);
    expect(text).not.toMatch(/PT intro/);
  });

  it("V2 uses the Portuguese resume and answer bank", () => {
    const result = packFor(PORTUGUESE_JOB, enOnly, ptExtra);
    expect(result.resumeRecommendation?.variant.name).toBe("CV ATS PT-BR 2026");
    const text = result.applicationAnswers.map((item) => item.recommendedAnswer ?? "").join("\n");
    expect(text).toMatch(/PT intro/);
    expect(text).not.toMatch(/EN intro/);
  });

  it("V3 does not borrow a Portuguese-only detail", () => {
    const result = packFor(ENGLISH_JOB, [APPLYFLOW], ptExtra);
    const text = JSON.stringify(result.applicationAnswers);
    expect(text).not.toMatch(/retentativas/);
    expect(result.resumeRecommendation?.variant.profile.evidence?.some((item) => /retentativas/.test(item.description))).toBe(false);
  });

  it("V4 keeps language routing and provenance on the selected resume", () => {
    const result = packFor(ENGLISH_JOB, enOnly, ptExtra);
    expect(result.resumeRecommendation?.jobLanguage).toBe("en");
    expect(result.resumeRecommendation?.variant.id).toBe("rv_en");
    const backend = result.applicationAnswers.find((item) => item.questionType === "react_next_node");
    expect(backend?.recommendedAnswer).toMatch(/EN frontend case/);
  });

  it("V5 follows the selected variant when language is unknown", () => {
    const { library, pt } = libraryFor(enOnly, ptExtra);
    const evidence = buildCandidateEvidence(pt, [], NOW);
    const decision = evaluateJobDecisionV2({
      jobText: "Senior React Developer — remote.",
      evidence,
      profile: pt,
      jobId: "job_unknown_language",
    });
    const recommendation = recommendResumeV2({
      jobText: "Senior React Developer — remote.",
      decision,
      profile: pt,
      library,
      now: NOW,
    });
    expect(recommendation.jobLanguage).toBe("unknown");
    expect(recommendation.variant.id).toBe("rv_pt");
    expect(recommendation.variant.profile.answerBank.tellUsAboutYourself).toMatch(/PT intro/);
    expect(recommendation.variant.profile.evidence?.some((item) => /retentativas/.test(item.description))).toBe(true);
    expect(recommendation.variant.profile.evidence?.some((item) => /EN backend/.test(item.description))).toBe(false);
  });
});

describe("application pack trust", () => {
  it("A1 keeps a supported claim and its evidence reference", () => {
    const audited = auditClaim("I built an idempotent ingestion workflow in Prospecta.", [PROSPECTA], {
      resumeVariantId: "rv_en",
      resumeVariantName: "CV ATS EN 2026",
    });
    expect(audited.status).not.toBe("remove");
    expect(audited.provenance?.evidenceId).toBe("ev-prospecta");
    expect(audited.provenance?.projectName).toBe("Prospecta");
    expect(audited.provenance?.resumeId).toBe("rv_en");
  });

  it("A2 removes an unsupported claim and keeps the reason", () => {
    const audited = auditClaim("I reduced lead duplication by 90%.", [PROSPECTA]);
    expect(audited.status).toBe("remove");
    expect(audited.reason).toMatch(/measured|not present|evidence/i);
  });

  it("A3 keeps declared English as a declaration", () => {
    const audited = auditClaim("Recorded English level: Advanced.", [], { englishLevel: "Advanced", resumeVariantId: "rv_en" });
    expect(audited.status).toBe("defensible");
    expect(audited.reason).toMatch(/declared/i);
    expect(audited.reason).toMatch(/not a certificate/i);
    const native = auditClaim("I am a native English speaker.", [], { englishLevel: "Advanced" });
    expect(native.status).toBe("remove");
  });

  it("A4 blocks an ineligible job", () => {
    const result = packFor(US_ONLY, [PROSPECTA], [PROSPECTA]);
    expect(result.status).toBe("blocked");
    expect(result.decision).toBe("skip");
  });

  it("A5 does not approve unknown eligibility", () => {
    const result = packFor(ONSITE, [PROSPECTA], [PROSPECTA]);
    expect(result.status).toBe("blocked");
    expect(result.decision).not.toBe("apply_high");
    expect(result.decision).not.toBe("apply_normal");
    expect(result.decision).not.toBe("apply_stretch");
  });

  it("A6 leaves missing salary unknown", () => {
    const result = packFor(ENGLISH_JOB, [PROSPECTA], [PROSPECTA]);
    expect(result.compensation?.compatibility).toBe("unknown");
    expect(result.compensation?.target).toBeUndefined();
  });

  it("A7 keeps the English pack free of the Portuguese-only claim", () => {
    const result = packFor(ENGLISH_JOB, [PROSPECTA], [
      evidence({
        ...PROSPECTA,
        description: "Ingestao idempotente com retentativas limitadas de callback.",
      }),
    ]);
    expect(result.resumeRecommendation?.variant.id).toBe("rv_en");
    const blob = JSON.stringify({
      answers: result.applicationAnswers,
      claims: result.claimAudit.claims,
    });
    expect(blob).not.toMatch(/retentativas/);
    expect(result.applicationAnswers.some((item) => item.recommendedAnswer?.includes("EN intro"))).toBe(true);
  });
});
