import { describe, expect, it } from "vitest";

import { parseApplicationDecisionSnapshot } from "../application-decision-snapshot.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { matchRequirementsToEvidence } from "../evidence-matching.js";
import { extractJobRequirements } from "../extract-job-requirements.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";
import { buildRecordedFact } from "../recorded-facts.js";

const NOW = new Date("2026-09-12T16:53:30.919Z");

/** Descrição original salva no DOG-002. Não especializar o extrator para esta empresa. */
export const BLUELIGHT_ORIGINAL_DESCRIPTION = `React Engineer - Remote, Latin America
Brasília, Federal District, Brazil
Engineering – Software Development / Full-Time / Remote

What we are looking for
- 3+ years of professional software development experience. 5+ years preferred but not required.
- 3+ years of professional experience working with React.
- Meaningful experience working on large, complex systems.
- A four-year college degree is required.
- Ability to take extreme ownership over your work.
`;

function fictionalProfile(overrides: Record<string, unknown> = {}) {
  return validateCandidateProfile({
    name: "Carla Mota",
    location: "Santos/SP, Brasil",
    englishLevel: "Advanced",
    roles: ["Full Stack Engineer"],
    skills: { React: null, TypeScript: null, Nodejs: null },
    salary: {},
    answerBank: EMPTY_ANSWER_BANK,
    facts: {},
    ...overrides,
  });
}

function educationReq(reqs: ReturnType<typeof extractJobRequirements>) {
  return reqs.find(
    (item) =>
      item.mandatory === true &&
      (/college degree|four-year|bachelor/i.test(item.label) || (item.qualifiers ?? []).includes("education")),
  );
}

describe("DOG-002 Bluelight — extração da descrição original", () => {
  it("separa duração de React da experiência profissional geral", () => {
    const reqs = extractJobRequirements(BLUELIGHT_ORIGINAL_DESCRIPTION);
    const general = reqs.find((item) => item.requirementType === "years" && !item.skillHint);
    const reactYears = reqs.find((item) => item.requirementType === "years" && /^react$/i.test(item.skillHint ?? ""));

    expect(general?.minYears).toBe(3);
    expect(general?.extractedText).toMatch(/professional software development experience/i);
    expect(general?.extractedText).not.toMatch(/working with React/i);

    expect(reactYears?.minYears).toBe(3);
    expect(reactYears?.skillHint).toMatch(/react/i);
    expect(reactYears?.extractedText).toMatch(/working with React/i);
    expect(reactYears?.id).not.toBe(general?.id);
  });

  it("extrai formação obrigatória e mantém 5+ years como preferência", () => {
    const reqs = extractJobRequirements(BLUELIGHT_ORIGINAL_DESCRIPTION);
    const degree = educationReq(reqs);
    const preferred = reqs.find((item) => item.minYears === 5);

    expect(degree).toBeDefined();
    expect(degree?.mandatory).toBe(true);
    expect(degree?.importance).toBe("fundamental");
    expect(degree?.extractedText).toMatch(/four-year college degree is required/i);

    expect(preferred?.importance).toBe("nice_to_have");
    expect(preferred?.mandatory).not.toBe(true);
    expect(preferred?.extractedText).toMatch(/preferred but not required/i);
  });

  it("não trata bachelor com equivalência prática como diploma obrigatório de quatro anos", () => {
    const reqs = extractJobRequirements(
      "Bachelor’s degree in Computer Science, Engineering, or related field — or equivalent practical experience.",
    );
    expect(educationReq(reqs)).toBeUndefined();
  });
});

describe("DOG-002 — matching de duração, formação e UNKNOWN", () => {
  it("React conhecido sem duração não comprova três anos de React", () => {
    const profile = fictionalProfile({ skills: { React: null }, facts: { totalYearsExperience: 8 } });
    const reqs = extractJobRequirements(BLUELIGHT_ORIGINAL_DESCRIPTION);
    const matches = matchRequirementsToEvidence(reqs, buildCandidateEvidence(profile, [], NOW));
    const reactYears = matches.find((item) => item.requirement.minYears === 3 && /^react$/i.test(item.requirement.skillHint ?? ""));
    expect(reactYears?.status).toBe("unknown");
    expect(reactYears?.matchedEvidence.some((item) => item.id === "profile-experience-total-years")).toBe(false);
    expect(reactYears?.reason).toMatch(/duration is not/i);
  });

  it("skill ou duração de carreira não aprovam formação obrigatória", () => {
    const profile = fictionalProfile({ skills: { React: 6 }, facts: { totalYearsExperience: 10 } });
    const result = evaluateJobDecisionV2({
      jobText: BLUELIGHT_ORIGINAL_DESCRIPTION,
      evidence: buildCandidateEvidence(profile, [], NOW),
      profile,
      jobId: "job_degree_unknown",
    });
    const degree = result.matches.find(
      (item) => item.requirement.mandatory && (/college degree|four-year|bachelor/i.test(item.requirement.label) || (item.requirement.qualifiers ?? []).includes("education")),
    );
    expect(degree?.status).toBe("unknown");
    expect(degree?.reason).toMatch(/degree|education|formação/i);
    expect(result.reasons.join(" ") + result.matches.map((item) => item.requirement.label).join(" ")).toMatch(
      /college degree|four-year|formação/i,
    );
  });

  it("períodos com React e backend entram na união, sem duplicar sobreposição", () => {
    const profile = fictionalProfile();
    const spanning = [
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "React/Next.js used regularly alongside backend",
        origin: "candidate_declaration",
        periodStart: "2023-01",
        periodEnd: "2025-06",
        project: "Independent period; regular React/Next.js with backend",
      }),
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: ".NET & React product work",
        origin: "document",
        periodStart: "2021-07",
        periodEnd: "2023-09",
      }),
    ];
    const duplicatedOverlap = [
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "React with backend services",
        origin: "document",
        periodStart: "2023-01",
        periodEnd: "2025-06",
      }),
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "React/Next.js used regularly alongside backend",
        origin: "candidate_declaration",
        periodStart: "2023-01",
        periodEnd: "2025-06",
      }),
    ];
    const reqs = extractJobRequirements("3+ years of professional experience working with React.");
    const proven = matchRequirementsToEvidence(reqs, [...buildCandidateEvidence(profile, [], NOW), ...spanning]);
    const overlapped = matchRequirementsToEvidence(reqs, [...buildCandidateEvidence(profile, [], NOW), ...duplicatedOverlap]);
    const provenMatch = proven.find((item) => item.requirement.minYears === 3 && /^react$/i.test(item.requirement.skillHint ?? ""));
    const overlappedMatch = overlapped.find((item) => item.requirement.minYears === 3 && /^react$/i.test(item.requirement.skillHint ?? ""));
    expect(provenMatch?.status).toBe("proven");
    expect(provenMatch?.reason).toMatch(/4\.0 year|after merging overlaps/i);
    expect(overlappedMatch?.status).toBe("partial");
    expect(overlappedMatch?.reason).toMatch(/2\.5 year|after merging overlaps/i);
  });

  it("evidência contrária à duração é incompatibilidade, ausência é UNKNOWN", () => {
    const profile = fictionalProfile({ skills: { React: 1 } });
    const absent = buildRecordedFact({
      kind: "experience_period",
      topic: "fullstack.period",
      label: "React",
      origin: "candidate_declaration",
      stance: "absent",
      periodStart: "2024-01",
      periodEnd: "2024-06",
    });
    const missing = evaluateJobDecisionV2({
      jobText: "3+ years of professional experience working with React.",
      evidence: buildCandidateEvidence(fictionalProfile({ skills: { React: null } }), [], NOW),
      profile: fictionalProfile({ skills: { React: null } }),
      jobId: "job_react_absent_duration",
    });
    const contrary = matchRequirementsToEvidence(
      extractJobRequirements("3+ years of professional experience working with React."),
      [...buildCandidateEvidence(profile, [], NOW), absent],
    );
    const missingMatch = missing.matches.find((item) => item.requirement.minYears === 3 && /^react$/i.test(item.requirement.skillHint ?? ""));
    const contraryMatch = contrary.find((item) => item.requirement.minYears === 3 && /^react$/i.test(item.requirement.skillHint ?? ""));
    expect(missingMatch?.status).toBe("unknown");
    expect(contraryMatch?.status).toBe("gap");
  });
});

describe("DOG-002 — snapshot registado permanece imutável", () => {
  it("conserva APPLY NORMAL / fit 88 mesmo se a análise atual ganhar requisitos novos", () => {
    const frozen = parseApplicationDecisionSnapshot({
      capturedAt: "2026-09-12T16:53:30.919Z",
      overallFit: 88,
      decision: "apply_normal",
      priority: 75,
      resumeVariant: "rv_principal",
      requirements: [
        { id: "phrase-professional-experience-3", label: "Professional experience (3+ years)", category: "seniority", status: "partial" },
        { id: "skill-react-1", label: "React", category: "frontend", status: "proven" },
      ],
      dimensions: { overall: 88, coreEngineering: 88, stack: 100, specialization: 88, seniority: 52, product: 100 },
    });
    const current = evaluateJobDecisionV2({
      jobText: BLUELIGHT_ORIGINAL_DESCRIPTION,
      evidence: buildCandidateEvidence(fictionalProfile(), [], NOW),
      profile: fictionalProfile(),
      jobId: "job_snapshot_guard",
    });

    expect(frozen?.capturedAt).toBe("2026-09-12T16:53:30.919Z");
    expect(frozen?.overallFit).toBe(88);
    expect(frozen?.decision).toBe("apply_normal");
    expect(frozen?.resumeVariant).toBe("rv_principal");
    expect(frozen?.requirements.find((item) => item.label === "React")?.status).toBe("proven");
    expect(current.matches.length).toBeGreaterThan(frozen?.requirements.length ?? 0);
  });
});
