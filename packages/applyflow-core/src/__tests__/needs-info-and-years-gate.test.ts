import { describe, expect, it } from "vitest";

import { canCreateApplicationPack, createApplicationPack } from "../application-pack.js";
import { gustavoProfile } from "../candidate-profile.js";
import { buildCandidateEvidence, evidenceFromProfile } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import { ingestApplyFlowJob, isJobMatchStale, reevaluateApplyFlowJobMatch } from "../ingest-applyflow-job.js";
import { presentInboxJobAnalysis } from "../inbox-analysis-presentation.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";
import { createResumeLibraryFromProfile, updateResumeVariant } from "../resume-library.js";

const NOW = new Date("2026-09-10T15:00:00.000Z");

const REACT_FIVE_YEARS_JOB = `Senior Frontend Engineer
Requirements:
- React (5+ years)
- TypeScript
You must have 5+ years of React experience.`;

const MIXED_UNKNOWN_AND_GAP_JOB = `Senior Python Backend Engineer
Requirements:
- 5+ years Python backend
- Kafka
- Elixir
Must have senior Python backend ownership.`;

function minimalProfile() {
  return validateCandidateProfile({
    name: "Ana Costa",
    roles: ["Product Engineer"],
    skills: {},
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: {},
  });
}

function reactKnownNoYears() {
  return validateCandidateProfile({
    name: "Ana Costa",
    roles: ["Product Engineer"],
    skills: { React: null, TypeScript: 3 },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: { totalYearsExperience: 8 },
  });
}

function reactThreeYears() {
  return validateCandidateProfile({
    name: "Ana Costa",
    roles: ["Product Engineer"],
    skills: { React: 3, TypeScript: 3 },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: { totalYearsExperience: 8 },
  });
}

function reactFiveYears() {
  return validateCandidateProfile({
    name: "Ana Costa",
    roles: ["Product Engineer"],
    skills: { React: 5, TypeScript: 5 },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: { totalYearsExperience: 8 },
  });
}

describe("UNKNOWN vs incompatibilidade comprovada", () => {
  it("perfil incompleto não comunica SKIP / incompatibilidade", () => {
    const profile = minimalProfile();
    const result = evaluateJobDecisionV2({
      jobText: REACT_FIVE_YEARS_JOB,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_incomplete",
    });
    expect(result.decision).toBe("needs_info");
    expect(result.reasons.join(" ")).toMatch(/Complete seu perfil para concluir a análise/i);
    expect(result.matches.some((item) => item.status === "gap")).toBe(false);
  });

  it("requisito comprovadamente atendido permanece proven/pass", () => {
    const profile = reactFiveYears();
    const result = evaluateJobDecisionV2({
      jobText: REACT_FIVE_YEARS_JOB,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_met",
    });
    const reactYears = result.matches.find((item) => /react/i.test(item.requirement.label) && item.requirement.minYears === 5);
    expect(reactYears?.status).toBe("proven");
    expect(result.decision).not.toBe("skip");
  });

  it("requisito comprovadamente não atendido vira gap e pode SKIP", () => {
    const profile = reactThreeYears();
    const result = evaluateJobDecisionV2({
      jobText: REACT_FIVE_YEARS_JOB,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_unmet",
    });
    const reactYears = result.matches.find((item) => /react/i.test(item.requirement.label) && item.requirement.minYears === 5);
    expect(reactYears?.status).toBe("gap");
    const yearsGate = result.gates.find((gate) => gate.type === "years" && /react/i.test(gate.label));
    expect(yearsGate?.result).toBe("fail");
    expect(result.decision).toBe("skip");
  });

  it("dados desconhecidos + impedimento real continuam SKIP", () => {
    const result = evaluateJobDecisionV2({
      jobText: MIXED_UNKNOWN_AND_GAP_JOB,
      evidence: buildCandidateEvidence(gustavoProfile, [], NOW),
      profile: gustavoProfile,
      jobId: "job_mix",
    });
    expect(result.matches.some((item) => /elixir|python backend/i.test(item.requirement.label) && (item.status === "gap" || item.status === "partial"))).toBe(
      true,
    );
    expect(result.decision).toBe("skip");
    expect(result.reasons.join(" ")).not.toMatch(/Complete seu perfil para concluir a análise/i);
  });
});

describe("gate de experiência com evidência parcial", () => {
  it("não atribui 5+ years de React a partir dos anos totais de carreira", () => {
    const profile = reactKnownNoYears();
    const reqs = extractJobRequirements(REACT_FIVE_YEARS_JOB);
    const reactYears = reqs.find((item) => /react/i.test(item.label) && item.minYears === 5);
    expect(reactYears).toBeDefined();
    const matches = matchRequirementsToEvidence(reqs, evidenceFromProfile(profile, NOW));
    const reactMatch = matches.find((item) => item.requirement.id === reactYears?.id);
    expect(reactMatch?.status).toBe("unknown");
    expect(reactMatch?.matchedEvidence.some((item) => item.id === "profile-experience-total-years")).toBe(false);
    expect(reactMatch?.reason).toMatch(/duration is not/i);
  });

  it("conhecer React sem duração deixa a barra temporal UNKNOWN", () => {
    const profile = reactKnownNoYears();
    const result = evaluateJobDecisionV2({
      jobText: REACT_FIVE_YEARS_JOB,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_react_unknown_years",
    });
    const reactYears = result.matches.find((item) => /react/i.test(item.requirement.label) && item.requirement.minYears === 5);
    expect(reactYears?.status).toBe("unknown");
    const yearsGate = result.gates.find((gate) => gate.type === "years" && /react/i.test(gate.label));
    expect(yearsGate?.result).toBe("unknown");
    expect(result.decision).not.toBe("apply_high");
    expect(result.decision).not.toBe("apply_normal");
  });

  it("partial por outro aspecto não derruba um years gate já comprovado", () => {
    const profile = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Product Engineer"],
      skills: { AWS: 4 },
      salary: {},
      answerBank: EMPTY_ANSWER_BANK,
      facts: {},
    });
    const result = evaluateJobDecisionV2({
      jobText: "Cloud Engineer\nRequirements:\n- 3+ years architecting AWS",
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_aws_partial",
    });
    const aws = result.matches.find((item) => /aws/i.test(item.requirement.label));
    expect(aws?.status).toBe("partial");
    const yearsGate = result.gates.find((gate) => gate.type === "years" && /aws/i.test(gate.label));
    expect(yearsGate?.result).toBe("pass");
    expect(yearsGate?.reason).toMatch(/years bar is met/i);
  });
});

describe("reevaluate jobMatch após editar o perfil", () => {
  it("atualiza derivados e não toca no snapshot da descrição", () => {
    const library = createResumeLibraryFromProfile(minimalProfile(), { source: "manual", now: NOW });
    const job = ingestApplyFlowJob({
      description: REACT_FIVE_YEARS_JOB,
      source: "paste",
      profile: minimalProfile(),
      resumeLibrary: library,
      now: NOW,
      id: "job_stale",
    });
    expect(job.jobMatch.decision).toBe("needs_info");
    const snapshot = job.descriptionSnapshot;

    const later = new Date("2026-09-10T16:00:00.000Z");
    const updated = updateResumeVariant(library, library.defaultVariantId, {
      profile: reactFiveYears(),
      now: later,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(isJobMatchStale(job, updated.library)).toBe(true);
    const refreshed = reevaluateApplyFlowJobMatch(job, reactFiveYears(), updated.library, later);
    expect(refreshed.descriptionSnapshot).toBe(snapshot);
    expect(refreshed.applicationPack).toBeUndefined();
    expect(refreshed.jobMatch.decision).not.toBe("needs_info");
    expect(refreshed.jobMatch.matchedSkills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(isJobMatchStale(refreshed, updated.library)).toBe(false);
  });
});

describe("inbox não promove APPLY V1 quando V2 é inconclusiva", () => {
  it("skills conhecidas sem anos totais não autorizam pack nem APPLY no inbox", () => {
    const profile = validateCandidateProfile({
      name: "Rita Nunes",
      roles: ["Product Engineer"],
      skills: { React: 5, TypeScript: 5 },
      salary: {},
      answerBank: EMPTY_ANSWER_BANK,
      facts: {},
    });
    const library = createResumeLibraryFromProfile(profile, { source: "manual", now: NOW });
    const job = ingestApplyFlowJob({
      description: `Senior Product Engineer — Remote SaaS
Requirements:
- 5+ years of professional experience
- React (5+ years)
- TypeScript
- English fluency required`,
      source: "paste",
      profile,
      resumeLibrary: library,
      now: NOW,
      id: "job_inbox_v2",
    });
    expect(job.jobMatch.decision).toBe("apply");
    const presented = presentInboxJobAnalysis(job, profile);
    expect(presented.source).toBe("v2");
    expect(presented.decision).toBe("needs_info");
    expect(presented.allowPack).toBe(false);
    expect(canCreateApplicationPack(job)).toBe(true);
    expect(canCreateApplicationPack(job, library)).toBe(false);
    const packed = createApplicationPack({ job, library, now: NOW });
    expect(packed.ok).toBe(false);
    if (!packed.ok) expect(packed.error).toMatch(/Complete seu perfil|Pack V1 não está pronto/i);
  });

  it("perfil completo autoriza pack V1 quando V2 também recomenda candidatura", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, { source: "manual", now: NOW });
    const job = ingestApplyFlowJob({
      description: `Senior Product Engineer — Remote Brazil
Requirements:
- 5+ years of professional experience
- React (5+ years)
- TypeScript
- Comfortable communicating in English
Remote role in Brazil.`,
      source: "paste",
      profile: gustavoProfile,
      resumeLibrary: library,
      now: NOW,
      id: "job_pack_complete",
    });
    expect(job.jobMatch.decision).toBe("apply");
    const presented = presentInboxJobAnalysis(job, gustavoProfile);
    expect(presented.decision).not.toBe("needs_info");
    expect(presented.decision).not.toBe("skip");
    expect(canCreateApplicationPack(job, library)).toBe(true);
    const packed = createApplicationPack({ job, library, now: NOW });
    expect(packed.ok).toBe(true);
  });

  it("incompatibilidade comprovada não cria pack mesmo com score técnico V1", () => {
    const profile = validateCandidateProfile({
      name: "Rita Nunes",
      roles: ["Product Engineer"],
      skills: { React: 5, TypeScript: 5, Elixir: 0 },
      salary: {},
      answerBank: EMPTY_ANSWER_BANK,
      facts: { totalYearsExperience: 5, location: "Brazil", englishLevel: "Advanced" },
    });
    const library = createResumeLibraryFromProfile(profile, { source: "manual", now: NOW });
    const job = ingestApplyFlowJob({
      description: `Senior Elixir Engineer
Must have Elixir (5+ years). React is optional.`,
      source: "paste",
      profile,
      resumeLibrary: library,
      now: NOW,
      id: "job_pack_gap",
    });
    const packed = createApplicationPack({ job, library, now: NOW });
    expect(packed.ok).toBe(false);
  });
});
