import { describe, expect, it } from "vitest";

import { createApplicationPackV2 } from "../application-pack-v2.js";
import { evaluateApplicationGates } from "../application-gates.js";
import { auditClaim } from "../claim-safety.js";
import {
  assessCompensationCompatibility,
  parseEmployerCompensation,
  recommendCompensation,
  selectCandidateExpectation,
} from "../compensation.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { classifyJobLanguage } from "../job-language.js";
import { recommendCurriculum } from "../curriculum-router.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile, type AnswerBank, type CandidateProfile } from "../profile-schema.js";
import { addResumeVariant, createResumeLibraryFromProfile } from "../resume-library.js";
import { recommendResumeV2 } from "../resume-router-v2.js";

const NOW = new Date("2026-10-26T15:00:00.000Z");
const STACK = "React, Next.js, TypeScript and Node.js. Minimum 5 years.";

const ENGLISH_JOB = `We are looking for a Senior Software Engineer to build and maintain our SaaS platform. Remote - Brazil. ${STACK}`;
const PORTUGUESE_JOB = `Buscamos uma pessoa desenvolvedora sênior para atuar na evolução de nossos produtos digitais. Remote - Brazil. ${STACK}`;
const AMBIGUOUS_JOB = "Senior React Developer — remote.";
const INTERNATIONAL_PT = `Company headquartered in the United States. Buscamos uma pessoa desenvolvedora sênior para atuar na evolução de nossos produtos digitais. Remote - Brazil. ${STACK}`;
const BRAZIL_EN = `Empresa brasileira em São Paulo. We are looking for a Senior Product Engineer to build and maintain our SaaS platform. Remote - Brazil. ${STACK}`;
const US_ONLY_EN = `We are looking for a Senior Product Engineer to build and maintain our SaaS platform. Remote - United States only. Applicants must reside in the United States. ${STACK}`;

function bank(language: "en" | "pt-BR"): AnswerBank {
  const prefix = language === "en" ? "EN" : "PT";
  return {
    ...EMPTY_ANSWER_BANK,
    tellUsAboutYourself: `${prefix} intro: production products with React and TypeScript.`,
    whyGoodFit: `${prefix} fit: React and TypeScript product work.`,
    availability: `${prefix} availability: can start React and TypeScript work.`,
    hardestChallenge: `${prefix} challenge: a React and TypeScript migration.`,
    productCase: `${prefix} product case: shipped a React and TypeScript platform.`,
    frontendCase: `${prefix} frontend case: React and TypeScript interfaces.`,
    backendCase: `${prefix} backend case: Node.js and TypeScript services.`,
    automationCase: `${prefix} automation case: TypeScript scripts for React delivery.`,
    leadershipCase: `${prefix} leadership case: guided a React and TypeScript team.`,
  };
}

function person(language: "en" | "pt-BR"): CandidateProfile {
  return validateCandidateProfile({
    name: "Candidato",
    location: "Santos, SP, Brazil",
    englishLevel: "Advanced",
    roles: ["Senior Full Stack Engineer"],
    skills: { React: 6, Nextjs: 3, TypeScript: 5, Nodejs: 6, PostgreSQL: 3 },
    salary: {
      cltSenior: "R$ 10.000/mês",
      pjSenior: "R$ 12.000/mês",
      usdMonthly: "USD 3,000/month",
      usdHourly: "USD 20/hour",
    },
    facts: {
      location: "Santos, SP, Brazil",
      totalYearsExperience: 6,
      remotePreference: "remote",
      englishLevel: "Advanced",
    },
    answerBank: bank(language),
  });
}

function bothVariants() {
  const pt = person("pt-BR");
  const en = person("en");
  const seeded = createResumeLibraryFromProfile(pt, { now: NOW, id: "rv_pt", name: "CV ATS PT-BR 2026" });
  const added = addResumeVariant(seeded, { profile: en, name: "CV ATS EN 2026", id: "rv_en", now: NOW });
  if (!added.ok) throw new Error(added.error);
  return { library: added.library, pt, en };
}

function decide(profile: CandidateProfile, jobText: string) {
  return evaluateJobDecisionV2({
    jobText,
    evidence: buildCandidateEvidence(profile, [], NOW),
    profile,
    jobId: "job_phase3",
  });
}

function route(jobText: string, library = bothVariants().library, profile = person("pt-BR")) {
  const decision = decide(profile, jobText);
  return recommendResumeV2({ jobText, decision, profile, library, now: NOW });
}

function pack(jobText: string, library = bothVariants().library, profile = person("pt-BR")) {
  const decision = decide(profile, jobText);
  return {
    decision,
    pack: createApplicationPackV2({
      jobId: "job_phase3",
      jobText,
      profile,
      evidence: buildCandidateEvidence(profile, [], NOW),
      decision,
      resumeLibrary: library,
      now: NOW,
    }),
  };
}

function pay(jobText: string, profile = person("en")) {
  const decision = decide(profile, jobText);
  return { decision, ...recommendCompensation({ jobText, profile, decision, jobId: "job_phase3" }) };
}

describe("job language classification", () => {
  it("classifies a full English posting and leaves a short title unknown", () => {
    expect(classifyJobLanguage("We are looking for a Senior Product Engineer to build and maintain our SaaS platform.")).toBe("en");
    expect(classifyJobLanguage(ENGLISH_JOB)).toBe("en");
    expect(classifyJobLanguage("Senior React Developer — remote.")).toBe("unknown");
    expect(classifyJobLanguage("Desenvolvedor React and TypeScript to build APIs.")).toBe("unknown");
  });

  it("classifies a full Portuguese posting without using headquarters", () => {
    expect(classifyJobLanguage(PORTUGUESE_JOB)).toBe("pt-BR");
    expect(classifyJobLanguage(INTERNATIONAL_PT)).toBe("pt-BR");
    expect(classifyJobLanguage(BRAZIL_EN)).toBe("en");
  });
});

describe("resume language routing", () => {
  it("L1 selects the English resume and its answer bank", () => {
    const { library } = bothVariants();
    const recommendation = route(ENGLISH_JOB, library);
    expect(recommendation.variant.id).toBe("rv_en");
    expect(recommendation.variant.name).toBe("CV ATS EN 2026");
    expect(recommendation.jobLanguage).toBe("en");
    expect(recommendation.resumeLanguage).toBe("en");
    expect(recommendation.reason).toMatch(/en resume/i);
    const ranked = recommendCurriculum(
      { skills: extractJobIntelligence(ENGLISH_JOB).detectedSkills },
      library,
      { now: NOW, jobText: ENGLISH_JOB },
    );
    expect(ranked?.recommendedVariantId).toBe("rv_en");
    const result = pack(ENGLISH_JOB, library);
    const intro = result.pack.applicationAnswers.find((item) => item.questionType === "tell_me_about_yourself");
    expect(intro?.recommendedAnswer).toMatch(/EN intro/);
    expect(intro?.recommendedAnswer).not.toMatch(/PT intro/);
    expect(result.pack.resumeRecommendation?.variant.profile.answerBank.whyGoodFit).toMatch(/EN fit/);
  });

  it("L2 keeps the Portuguese resume for a Portuguese posting", () => {
    const result = pack(PORTUGUESE_JOB);
    expect(result.pack.resumeRecommendation?.variant.id).toBe("rv_pt");
    expect(result.pack.resumeRecommendation?.jobLanguage).toBe("pt-BR");
    const intro = result.pack.applicationAnswers.find((item) => item.questionType === "tell_me_about_yourself");
    expect(intro?.recommendedAnswer).toMatch(/PT intro/);
    expect(intro?.recommendedAnswer).not.toMatch(/EN intro/);
  });

  it("L3 does not invent a language for an ambiguous title", () => {
    const recommendation = route(AMBIGUOUS_JOB);
    expect(recommendation.jobLanguage).toBe("unknown");
    expect(recommendation.variant.id).toBe("rv_pt");
    expect(recommendation.requiresLanguageConfirmation).toBe(false);
    expect(recommendation.reason).toMatch(/not established/i);
  });

  it("L4 prefers the posting language over the employer country", () => {
    const recommendation = route(INTERNATIONAL_PT);
    expect(recommendation.jobLanguage).toBe("pt-BR");
    expect(recommendation.variant.id).toBe("rv_pt");
  });

  it("L5 prefers an English posting from a Brazilian company", () => {
    const recommendation = route(BRAZIL_EN);
    expect(recommendation.jobLanguage).toBe("en");
    expect(recommendation.variant.id).toBe("rv_en");
  });

  it("L6 falls back when the English variant is absent", () => {
    const pt = person("pt-BR");
    const library = createResumeLibraryFromProfile(pt, { now: NOW, id: "rv_pt", name: "CV ATS PT-BR 2026" });
    const added = addResumeVariant(library, {
      profile: person("pt-BR"),
      name: "CV ATS PT-BR backup",
      id: "rv_pt_backup",
      now: NOW,
    });
    if (!added.ok) throw new Error(added.error);
    const recommendation = route(ENGLISH_JOB, added.library, pt);
    expect(recommendation.jobLanguage).toBe("en");
    expect(recommendation.variant.name).not.toMatch(/\bEN\b/);
    expect(recommendation.requiresLanguageConfirmation).toBe(true);
    expect(recommendation.reason).toMatch(/did not invent/i);
    expect(added.library.variants).toHaveLength(2);
  });

  it("L7 keeps an ineligible English job blocked", () => {
    const recommendation = route(US_ONLY_EN);
    expect(recommendation.jobLanguage).toBe("en");
    expect(recommendation.variant.id).toBe("rv_en");
    const result = pack(US_ONLY_EN);
    expect(result.decision.eligibility?.status).toBe("ineligible");
    expect(result.decision.decision).toBe("skip");
    expect(result.pack.status).toBe("blocked");
    expect(result.pack.decision).not.toBe("apply_high");
    expect(result.pack.decision).not.toBe("apply_normal");
    expect(result.pack.decision).not.toBe("apply_stretch");
  });

  it("L8 uses only the selected English answer bank", () => {
    const result = pack(ENGLISH_JOB);
    const answers = result.pack.applicationAnswers;
    const text = answers.map((item) => item.recommendedAnswer ?? "").join("\n");
    expect(text).toMatch(/EN frontend case/);
    expect(text).toMatch(/EN product case/);
    expect(text).not.toMatch(/PT /);
    const selected = result.pack.resumeRecommendation?.variant.profile.answerBank;
    expect(selected?.frontendCase).toMatch(/EN frontend case/);
    expect(selected?.backendCase).toMatch(/EN backend case/);
    expect(selected?.productCase).toMatch(/EN product case/);
    expect(selected?.automationCase).toMatch(/EN automation case/);
    expect(selected?.leadershipCase).toMatch(/EN leadership case/);
    expect(selected?.hardestChallenge).toMatch(/EN challenge/);
  });
});

describe("compensation integrity", () => {
  it("C1 compares a CLT range in BRL with the CLT preference", () => {
    const result = pay(`CLT. BRL 12,000-18,000 per month. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.currency).toBe("BRL");
    expect(result.recommendation.compatibility).toBe("compatible");
    expect(result.recommendation.expectation?.amount).toBe(10000);
    expect(result.recommendation.target).toBeUndefined();
    expect(result.recommendation.reasoning.join(" ")).not.toMatch(/USD/);
  });

  it("C2 uses the PJ preference instead of the CLT amount", () => {
    const result = pay(`PJ. BRL 14.000/mês. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.currency).toBe("BRL");
    expect(result.recommendation.expectation?.amount).toBe(12000);
    expect(result.recommendation.expectation?.employmentType).toBe("pj");
    expect(result.recommendation.compatibility).toBe("compatible");
  });

  it("C3 keeps the USD preference and the published range, without a midpoint target", () => {
    const result = pay(`International contractor. USD 4,000-7,000 per month. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.employer?.min).toBe(4000);
    expect(result.recommendation.employer?.max).toBe(7000);
    expect(result.recommendation.expectation?.amount).toBe(3000);
    expect(result.recommendation.target).toBeUndefined();
    expect(result.recommendation.compatibility).toBe("compatible");
    expect(result.recommendation.reasoning.join(" ")).not.toMatch(/5,?500/);
  });

  it("C4 leaves missing employer compensation unknown", () => {
    const result = pay(`We are looking for a Senior Product Engineer to build and maintain our SaaS platform. Remote - Brazil. CLT. ${STACK}`);
    expect(result.recommendation.employer?.min).toBeUndefined();
    expect(result.recommendation.compatibility).toBe("unknown");
    expect(result.recommendation.target).toBeUndefined();
    expect(result.recommendation.needsCandidateInput).toBe(true);
  });

  it("C5 does not guess USD from a bare dollar sign", () => {
    const employer = parseEmployerCompensation(`Compensation: $ 5,000 per month. Remote - Brazil. ${STACK}`);
    expect(employer.currency).toBe("unknown");
    const result = pay(`Compensation: $ 5,000 per month. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.compatibility).toBe("unknown");
  });

  it("C6 compares a stated annual amount with a monthly preference by dividing by 12", () => {
    const result = pay(`CLT. BRL 150,000 annually. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.currency).toBe("BRL");
    expect(result.recommendation.employer?.period).toBe("annual");
    expect(result.recommendation.compatibility).toBe("compatible");
    expect(result.recommendation.reasoning.join(" ")).toMatch(/12/);
    expect(result.recommendation.target).toBeUndefined();
  });

  it("C7 does not convert hourly pay into a monthly salary", () => {
    const result = pay(`Contractor. US$ 30/hour. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.employer?.period).toBe("hourly");
    expect(result.recommendation.expectation?.amount).toBe(20);
    expect(result.recommendation.expectation?.period).toBe("hourly");
    expect(result.recommendation.compatibility).toBe("compatible");
    expect(result.recommendation.reasoning.join(" ")).not.toMatch(/\b160\b|\b176\b/);
    const profile = person("en");
    const employer = parseEmployerCompensation("Contractor. US$ 30/hour.");
    const monthly = selectCandidateExpectation(profile, { ...employer, period: "monthly" });
    const mixed = assessCompensationCompatibility(employer, monthly);
    expect(mixed.compatibility).toBe("unknown");
    expect(mixed.reasoning.join(" ")).toMatch(/not converted/i);
  });

  it("C8 does not choose CLT or PJ when employment type is absent", () => {
    const result = pay(`BRL 12.000/mês. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.employer?.employmentType).toBe("unknown");
    expect(result.recommendation.expectation).toBeUndefined();
    expect(result.recommendation.compatibility).toBe("unknown");
  });

  it("C9 does not compare BRL with USD numerically", () => {
    const result = pay(`CLT. USD 4,000 per month. Remote - Brazil. ${STACK}`);
    expect(result.recommendation.compatibility).toBe("unknown");
    expect(result.recommendation.target).toBeUndefined();
    expect(result.recommendation.reasoning.join(" ")).toMatch(/not compared/i);
  });

  it("C10 marks a range below the preference without a hard rejection", () => {
    const jobText = `CLT. BRL 7,000-8,000 per month. Remote - Brazil. ${STACK}`;
    const result = pay(jobText);
    expect(result.recommendation.compatibility).toBe("below_expectation");
    expect(result.decision.decision).not.toBe("skip");
    expect(result.decision.eligibility?.status).not.toBe("ineligible");
    const gate = evaluateApplicationGates({
      jobText,
      profile: person("en"),
      matches: result.decision.matches,
    }).find((item) => item.type === "salary");
    expect(gate?.result).not.toBe("fail");
    expect(gate?.required).toBe(false);
  });

  it("C11 keeps declared English without turning it into native fluency", () => {
    const kept = auditClaim("Recorded English level: Advanced.", [], { englishLevel: "Advanced" });
    expect(kept.status).toBe("defensible");
    expect(kept.reason).toMatch(/declared English/i);
    const native = auditClaim("I am a native English speaker.", [], { englishLevel: "Advanced" });
    expect(native.status).toBe("remove");
    expect(native.reason).toMatch(/native/i);
  });

  it("C12 cites a salary preference without treating it as past earnings", () => {
    const kept = auditClaim("Recorded preference USD 3,000/month.", [], {
      salaryPreferences: ["USD 3,000/month"],
    });
    expect(kept.status).toBe("defensible");
    expect(kept.reason).toMatch(/preference/i);
    const earned = auditClaim("I earned USD 3,000/month as previous salary.", [], {
      salaryPreferences: ["USD 3,000/month"],
    });
    expect(earned.status).toBe("remove");
    expect(earned.reason).toMatch(/past earnings/i);
  });
});
