import { describe, expect, it } from "vitest";

import { parseEvidence } from "../evidence-schema.js";
import { validateCandidateProfile, validateSavableCandidateProfile } from "../profile-schema.js";
import { candidateProfileFromDraft, draftFromCandidateProfile } from "../profile-draft.js";
import {
  buildRecordedFact,
  inclusiveMonthCount,
  unionDocumentedMonths,
} from "../recorded-facts.js";
import { captureApplicationDecisionSnapshot } from "../application-decision-snapshot.js";
import { evaluateJobDecisionV2 } from "../evaluate-job-decision-v2.js";
import { buildCandidateEvidence } from "../evidence-from-profile.js";

const NOW = new Date("2026-09-11T03:40:00.000Z");

function fictionalProfile(evidence: ReturnType<typeof buildRecordedFact>[] = []) {
  return validateCandidateProfile({
    name: "Carla Mota",
    location: "Recife/PE, Brasil",
    englishLevel: "Advanced",
    comfortableInEnglish: true,
    roles: ["Full Stack Engineer"],
    skills: { TypeScript: null, Nodejs: null, PostgreSQL: null },
    salary: {},
    facts: {},
    evidence,
  });
}

describe("recorded facts — periods and origin", () => {
  it("une períodos sobrepostos sem contar duas vezes", () => {
    expect(
      unionDocumentedMonths([
        { start: "2023-01", end: "2024-12" },
        { start: "2024-06", end: "2025-06" },
      ]),
    ).toBe(inclusiveMonthCount("2023-01", "2025-06"));
    expect(inclusiveMonthCount("2023-01", "2025-06")).toBe(30);
  });

  it("recusa precisão diária inventada", () => {
    expect(() =>
      buildRecordedFact({
        kind: "experience_period",
        topic: "fullstack.period",
        label: "Full-stack autonomous work",
        origin: "document",
        periodStart: "2023-01-15",
        periodEnd: "2025-06-30",
      }),
    ).toThrow(/YYYY-MM/);
  });

  it("declaração do candidato não vira verified", () => {
    const fact = buildRecordedFact({
      kind: "skill_component",
      topic: "supabase.database",
      label: "Supabase Database",
      origin: "candidate_declaration",
      sourceRef: "apps/example/db.ts",
    });
    expect(fact.confidence).not.toBe("verified");
    expect(fact.origin).toBe("candidate_declaration");
    expect(fact.source).toBe("candidate_input");
  });

  it("normaliza tentativa de audited em declaração", () => {
    const parsed = parseEvidence({
      id: "fact_forced",
      subject: "skill",
      label: "Supabase Auth",
      description: "Declared only.",
      source: "candidate_input",
      confidence: "verified",
      usableForClaims: true,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      origin: "candidate_declaration",
    });
    expect(parsed?.confidence).toBe("strong");
  });
});

describe("recorded facts — profile compatibility", () => {
  it("JSON antigo sem evidence continua válido", () => {
    const profile = validateCandidateProfile({
      name: "Ana Lima",
      roles: ["Engineer"],
      skills: { React: null },
    });
    expect(profile.evidence).toBeUndefined();
    expect(profile.facts).toEqual({});
  });

  it("gravação recusa fato inválido sem persistir o resto", () => {
    expect(() =>
      validateSavableCandidateProfile({
        name: "Ana Lima",
        roles: ["Engineer"],
        skills: { React: null },
        evidence: [{ id: "bad" }],
      }),
    ).toThrow(/inválido/i);
  });

  it("rascunho preserva facts, answerBank e evidence existentes", () => {
    const fact = buildRecordedFact(
      {
        id: "fact_keep",
        kind: "skill_component",
        topic: "supabase.auth",
        label: "Supabase Auth",
        origin: "candidate_declaration",
      },
      NOW,
    );
    const profile = fictionalProfile([fact]);
    profile.facts.location = "Recife/PE, Brasil";
    profile.answerBank.whyGoodFit = "Produto local.";
    const again = candidateProfileFromDraft(draftFromCandidateProfile(profile), profile);
    expect(again.evidence?.map((item) => item.id)).toEqual(["fact_keep"]);
    expect(again.facts.location).toBe("Recife/PE, Brasil");
    expect(again.answerBank.whyGoodFit).toBe("Produto local.");
  });

  it("snapshot histórico não muda quando o perfil ganha evidência depois", () => {
    const before = fictionalProfile();
    const decision = evaluateJobDecisionV2({
      jobText: "Full-stack engineer. 2+ years experience as a full-stack developer. React.",
      evidence: buildCandidateEvidence(before, [], NOW),
      profile: before,
      jobId: "job_hist",
    });
    const snapshot = captureApplicationDecisionSnapshot({
      decision,
      resumeVariant: "rv_test",
      now: NOW,
    });
    const frozen = structuredClone(snapshot);
    const later = fictionalProfile([
      buildRecordedFact(
        {
          kind: "experience_period",
          topic: "fullstack.period",
          label: "Full-stack autonomous work",
          origin: "document",
          periodStart: "2023-01",
          periodEnd: "2025-06",
        },
        NOW,
      ),
    ]);
    expect(later.evidence).toHaveLength(1);
    expect(snapshot).toEqual(frozen);
    expect(snapshot.decision).toBe(decision.decision);
  });
});
