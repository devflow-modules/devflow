import { describe, expect, it } from "vitest";

import { createApplicationPackV2 } from "../application-pack-v2.js";
import { TEMPO_ORIGINAL_DESCRIPTION } from "./dog-001-tempo-requirements.test.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { validateCandidateProfile } from "../profile-schema.js";
import { buildRecordedFact } from "../recorded-facts.js";

const NOW = new Date("2026-09-11T03:40:00.000Z");

const TEMPO_LIKE = `Full-Stack Engineer (Remote)
Brazil (Remote)
Build and maintain backend capabilities in TypeScript, including Supabase (database, auth, storage) and Supabase Edge Functions.
Create APIs with REST and OpenAPI/Swagger.
2+ years experience as a full-stack developer.
Maintain an online presence between the hours of 9am - 4pm EST
Fluent in English (written and spoken).
Starting salary of $40,000 USD with the opportunity to increase to $60,000 USD`;

function profileWith(facts: ReturnType<typeof buildRecordedFact>[], skills: Record<string, number | null> = {
  TypeScript: null,
  Nodejs: null,
  PostgreSQL: null,
}) {
  return validateCandidateProfile({
    name: "Carla Mota",
    location: "Santos/SP, Brasil",
    englishLevel: "Advanced",
    comfortableInEnglish: true,
    roles: ["Full Stack Engineer"],
    skills,
    salary: {},
    facts: {},
    evidence: facts,
  });
}

function decide(facts: ReturnType<typeof buildRecordedFact>[], jobId = "job_tempo_fixture") {
  const profile = profileWith(facts);
  return evaluateJobDecisionV2({
    jobText: TEMPO_LIKE,
    evidence: buildCandidateEvidence(profile, [], NOW),
    profile,
    jobId,
  });
}

describe("recorded facts — matching", () => {
  it("Database/Auth conhecidos deixam Storage e Edge desconhecidos", () => {
    const result = decide([
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.database",
        label: "Supabase Database",
        origin: "candidate_declaration",
        technologies: ["Supabase Database", "Supabase"],
      }, NOW),
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.auth",
        label: "Supabase Auth",
        origin: "candidate_declaration",
        technologies: ["Supabase Auth", "Supabase"],
      }, NOW),
    ]);
    const supabase = result.matches.find((item) => item.requirement.skillHint === "Supabase");
    const edge = result.matches.find((item) => /edge function/i.test(item.requirement.label));
    expect(supabase?.status).toBe("partial");
    expect(supabase?.reason).toMatch(/Database/i);
    expect(supabase?.reason).toMatch(/Auth/i);
    expect(supabase?.reason).toMatch(/Storage/i);
    expect(supabase?.reason).toMatch(/do not prove Storage or Edge/i);
    expect(edge?.status).toBe("unknown");
    expect(edge?.reason).toMatch(/does not establish Supabase Edge Functions/i);
  });

  it("TypeScript e Node separados não provam backend; evidência conjunta prova", () => {
    const separate = decide([]);
    expect(separate.matches.find((item) => /typescript on the backend/i.test(item.requirement.label))?.status).toBe(
      "unknown",
    );
    const joint = decide([
      buildRecordedFact({
        kind: "joint_skill",
        topic: "typescript.backend",
        label: "TypeScript on the backend",
        origin: "candidate_declaration",
        technologies: ["TypeScript", "Node.js"],
        description: "Direct participation writing TypeScript backend APIs on Node.js runtime.",
      }, NOW),
    ]);
    expect(joint.matches.find((item) => /typescript on the backend/i.test(item.requirement.label))?.status).toBe(
      "proven",
    );
  });

  it("período documental full stack atende 2+ anos sem virar cinco anos", () => {
    const result = decide([
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "Full-stack autonomous work",
        origin: "document",
        sourceRef: "cv",
        periodStart: "2023-01",
        periodEnd: "2025-06",
      }, NOW),
    ]);
    const years = result.matches.find((item) => item.requirement.requirementType === "years" && /full-stack/i.test(item.requirement.label));
    expect(years?.status).toBe("proven");
    expect(years?.reason).toContain("2.5 year");
    expect(years?.reason).toMatch(/not a declared career total/i);
    expect(years?.reason.toLowerCase()).not.toContain("five years");
    const yearsGate = result.gates.find((gate) => gate.type === "years");
    expect(yearsGate?.label).toMatch(/full-stack/i);
    expect(yearsGate?.result).toBe("pass");
    expect(yearsGate?.reason).toContain("2.5 year");
    expect(yearsGate?.reason).not.toMatch(/Total years are not recorded/i);
  });

  it("mandatory/binary n/a não confirma Edge Functions nem inglês", () => {
    const result = decide([
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.database",
        label: "Supabase Database",
        origin: "candidate_declaration",
        technologies: ["Supabase Database", "Supabase"],
      }, NOW),
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.auth",
        label: "Supabase Auth",
        origin: "candidate_declaration",
        technologies: ["Supabase Auth", "Supabase"],
      }, NOW),
    ]);
    expect(result.matches.find((item) => /edge function/i.test(item.requirement.label))?.status).toBe("unknown");
    expect(result.matches.find((item) => item.requirement.requirementType === "language")?.status).toBe("partial");
    const mandatory = result.gates.find((gate) => gate.type === "mandatory_skill");
    const binary = result.gates.find((gate) => gate.type === "binary_knockout");
    const edge = result.matches.find((item) => /edge function/i.test(item.requirement.label));
    expect(mandatory?.result).not.toBe("pass");
    if (edge?.requirement.mandatory) {
      expect(mandatory?.result).toBe("unknown");
      expect(mandatory?.reason).toMatch(/unconfirmed/i);
    } else {
      expect(mandatory?.result).toBe("not_applicable");
      expect(mandatory?.reason).toMatch(/not confirmation/i);
    }
    expect(mandatory?.reason).toMatch(/Edge Functions/i);
    expect(binary?.result).toBe("not_applicable");
    expect(binary?.reason).toMatch(/not confirmation of eligibility/i);
    expect(binary?.result).not.toBe("pass");
    expect(result.gates.find((gate) => gate.type === "english")?.result).toBe("unknown");

    const original = evaluateJobDecisionV2({
      jobText: TEMPO_ORIGINAL_DESCRIPTION,
      evidence: buildCandidateEvidence(profileWith([]), [], NOW),
      profile: profileWith([]),
      jobId: "job_mtwa1mau_cu40gjkw",
    });
    const originalMandatory = original.gates.find((gate) => gate.type === "mandatory_skill");
    expect(originalMandatory?.reason).not.toMatch(/No proven mandatory-skill knockout/i);
    if (originalMandatory?.result === "pass") {
      expect(originalMandatory.reason).toMatch(/not confirmation of other listed skills/i);
      expect(originalMandatory.reason).toMatch(/Edge Functions/i);
    } else {
      expect(originalMandatory?.result).not.toBe("pass");
    }
    expect(original.gates.find((gate) => gate.type === "binary_knockout")?.result).toBe("not_applicable");
  });

  it("disponibilidade da Tempo não vira janela universal; DST permanece ambíguo", () => {
    const fact = buildRecordedFact({
      kind: "availability",
      topic: "availability.window",
      label: "9am–4pm EST",
      origin: "candidate_declaration",
      declaredValue: "can_meet",
      relatedJobId: "job_tempo_fixture",
      scheduleWindow: { label: "9am–4pm EST", timezoneLabel: "EST", dstPolicy: "ambiguous" },
    }, NOW);
    const scoped = decide([fact], "job_tempo_fixture");
    const hours = scoped.matches.find((item) => item.requirement.requirementType === "schedule");
    const gate = scoped.gates.find((item) => item.type === "hours");
    expect(hours?.status).toBe("partial");
    expect(hours?.reason).toMatch(/9am\s*-\s*4pm EST/i);
    expect(hours?.reason).toMatch(/daylight saving/i);
    expect(gate?.result).toBe("unknown");

    const otherJob = evaluateJobDecisionV2({
      jobText: TEMPO_LIKE,
      evidence: buildCandidateEvidence(profileWith([fact]), [], NOW),
      profile: profileWith([fact]),
      jobId: "job_other",
    });
    expect(otherJob.matches.find((item) => item.requirement.requirementType === "schedule")?.status).toBe("unknown");

    const differentWindow = decide([
      buildRecordedFact({
        kind: "availability",
        topic: "availability.window",
        label: "10am-6pm EST",
        origin: "candidate_declaration",
        declaredValue: "can_meet",
        relatedJobId: "job_tempo_fixture",
        scheduleWindow: { label: "10am-6pm EST", timezoneLabel: "EST", dstPolicy: "ambiguous" },
      }, NOW),
    ], "job_tempo_fixture");
    expect(differentWindow.matches.find((item) => item.requirement.requirementType === "schedule")?.status).toBe(
      "unknown",
    );
  });

  it("disponibilidade real da Tempo fica job-scoped e candidate_declaration", () => {
    const tempoJobId = "job_mtwa1mau_cu40gjkw";
    const fact = buildRecordedFact({
      kind: "availability",
      topic: "availability.window",
      label: "9am–4pm EST",
      origin: "candidate_declaration",
      declaredValue: "can_meet",
      relatedJobId: tempoJobId,
      sourceRef: "Candidate confirmation for Tempo posting hours",
      scheduleWindow: { label: "9am–4pm EST", timezoneLabel: "EST", dstPolicy: "ambiguous" },
    }, NOW);
    expect(fact.origin).toBe("candidate_declaration");
    expect(fact.relatedJobId).toBe(tempoJobId);
    expect(fact.scheduleWindow?.label).toBe("9am–4pm EST");

    const scoped = evaluateJobDecisionV2({
      jobText: TEMPO_LIKE,
      evidence: buildCandidateEvidence(profileWith([fact]), [], NOW),
      profile: profileWith([fact]),
      jobId: tempoJobId,
    });
    const hours = scoped.matches.find((item) => item.requirement.requirementType === "schedule");
    expect(hours?.status).toBe("partial");
    expect(hours?.matchedEvidence.some((item) => item.id === fact.id && item.origin === "candidate_declaration")).toBe(
      true,
    );
    expect(hours?.reason).toMatch(/daylight saving/i);

    const other = evaluateJobDecisionV2({
      jobText: TEMPO_LIKE,
      evidence: buildCandidateEvidence(profileWith([fact]), [], NOW),
      profile: profileWith([fact]),
      jobId: "job_other_company",
    });
    expect(other.matches.find((item) => item.requirement.requirementType === "schedule")?.status).toBe("unknown");
    expect(other.matches.find((item) => item.requirement.requirementType === "schedule")?.reason).toMatch(
      /not recorded|different window|not treated as universal/i,
    );
  });

  it("declaração negativa é gap; ausência de informação continua unknown", () => {
    const reqs = extractJobRequirements("Supabase Edge Functions required.");
    const absent = matchRequirementsToEvidence(
      reqs,
      [
        buildRecordedFact({
          kind: "skill_component",
          topic: "supabase.edge_functions",
          label: "Supabase Edge Functions",
          origin: "candidate_declaration",
          stance: "absent",
        }, NOW),
      ],
    );
    expect(absent.find((item) => /edge/i.test(item.requirement.label))?.status).toBe("gap");

    const missing = matchRequirementsToEvidence(reqs, []);
    expect(missing.find((item) => /edge/i.test(item.requirement.label))?.status).toBe("unknown");
  });

  it("Advanced com conforto continua parcial frente a Fluent", () => {
    const result = decide([]);
    const english = result.matches.find((item) => item.requirement.requirementType === "language");
    expect(english?.status).toBe("partial");
    expect(english?.reason).toMatch(/Advanced/);
    expect(english?.reason).not.toMatch(/Recorded Fluent/);
  });

  it("pack Tempo declara Database/Auth e o período documental, sem Storage, Edge ou cinco anos", () => {
    const tempoJobId = "job_mtwa1mau_cu40gjkw";
    const facts = [
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.database",
        label: "Supabase Database",
        origin: "candidate_declaration",
        technologies: ["Supabase Database", "Supabase"],
      }, NOW),
      buildRecordedFact({
        kind: "skill_component",
        topic: "supabase.auth",
        label: "Supabase Auth",
        origin: "candidate_declaration",
        technologies: ["Supabase Auth", "Supabase"],
      }, NOW),
      buildRecordedFact({
        kind: "joint_skill",
        topic: "typescript.backend",
        label: "TypeScript on the backend",
        origin: "candidate_declaration",
        technologies: ["TypeScript", "Node.js"],
      }, NOW),
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "Full-stack autonomous work",
        origin: "document",
        periodStart: "2023-01",
        periodEnd: "2025-06",
      }, NOW),
      buildRecordedFact({
        kind: "availability",
        topic: "availability.window",
        label: "9am–4pm EST",
        origin: "candidate_declaration",
        declaredValue: "can_meet",
        relatedJobId: tempoJobId,
        scheduleWindow: { label: "9am–4pm EST", timezoneLabel: "EST", dstPolicy: "ambiguous" },
      }, NOW),
    ];
    const profile = profileWith(facts, {
      TypeScript: null,
      Nodejs: null,
      React: null,
      REST: null,
      OpenAPI: null,
    });
    const decision = evaluateJobDecisionV2({
      jobText: TEMPO_LIKE,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: tempoJobId,
    });
    const pack = createApplicationPackV2({
      jobId: tempoJobId,
      jobText: TEMPO_LIKE,
      jobTitle: "Full-Stack Engineer",
      companyName: "Tempo",
      profile,
      evidence: buildCandidateEvidence(profile, [], NOW),
      decision,
      now: NOW,
    });
    expect(pack.status).toBe("ready");
    expect(pack.applicationAnswers.find((item) => item.questionType === "english")?.recommendedAnswer).toMatch(/Advanced/);
    expect(pack.applicationAnswers.find((item) => item.questionType === "english")?.recommendedAnswer).not.toMatch(/Fluent/);
    expect(pack.resumeRecommendation?.allowedKeywords).toEqual(
      expect.arrayContaining(["Supabase Database", "Supabase Auth"]),
    );
    expect(pack.resumeRecommendation?.allowedKeywords.join(" ")).not.toMatch(/Storage|Edge/i);
    expect(pack.resumeRecommendation?.forbiddenKeywords).toEqual(
      expect.arrayContaining(["Supabase Storage", "Supabase Edge Functions"]),
    );
    const packText = [
      pack.cvPersonalization?.headline,
      ...(pack.cvPersonalization?.experienceChanges ?? []).map((item) => item.proposed),
      ...(pack.cvPersonalization?.skillsChanges ?? []).map((item) => item.proposed),
      ...(pack.applicationAnswers ?? []).map((item) => item.recommendedAnswer),
    ]
      .filter(Boolean)
      .join("\n");
    expect(packText).not.toMatch(/5\+ years|five years/i);
    expect(pack.applicationAnswers.find((item) => item.questionType === "availability")?.recommendedAnswer).toMatch(
      /9am–4pm EST|this posting only/i,
    );
    expect(pack.applicationAnswers.find((item) => item.questionType === "availability")?.recommendedAnswer).toMatch(
      /ambiguous|daylight/i,
    );
    expect(pack.applicationAnswers.find((item) => item.questionType === "salary")?.status).toBe("needs_candidate_input");
    expect(pack.compensation?.needsCandidateInput).toBe(true);
  });
});
