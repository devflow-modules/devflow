import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import {
  computeCopilotJobMatch,
  decideCopilotJobMatch,
  splitRequiredPreferredSkills,
} from "../copilot-job-match.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { EMPTY_ANSWER_BANK, validateCandidateProfile } from "../profile-schema.js";

const FULL_STACK_JOB = `Senior Full Stack Engineer
Empresa X
Remote · CLT

Requirements:
- React
- TypeScript
- Node.js
- PostgreSQL
- APIs

Nice to have:
- Docker
- Jest
`;

const PARTIAL_JOB = `Senior Frontend Engineer
Hybrid

Requirements:
- React
- TypeScript
- Kubernetes
- AWS

GraphQL is used across the frontend.
`;

const INCOMPATIBLE_JOB = `Junior Java Engineer
Onsite São Paulo · Internship

Requirements:
- Java
- Spring
- Elixir
- Ruby on Rails

Must work from the office. Junior or intern only. Mainframe is a plus.
`;

describe("decideCopilotJobMatch", () => {
  it("85–100 APPLY, 70–84 REVIEW, 0–69 SKIP", () => {
    expect(decideCopilotJobMatch(100)).toBe("apply");
    expect(decideCopilotJobMatch(85)).toBe("apply");
    expect(decideCopilotJobMatch(84)).toBe("review");
    expect(decideCopilotJobMatch(70)).toBe("review");
    expect(decideCopilotJobMatch(69)).toBe("skip");
    expect(decideCopilotJobMatch(0)).toBe("skip");
  });
});

describe("splitRequiredPreferredSkills", () => {
  it("separa required e nice-to-have quando o texto permite", () => {
    const intel = extractJobIntelligence(FULL_STACK_JOB);
    const split = splitRequiredPreferredSkills(FULL_STACK_JOB, intel.detectedSkills);
    expect(split.required).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js", "PostgreSQL"]));
    expect(split.preferred).toEqual(expect.arrayContaining(["Docker", "Jest"]));
    expect(split.preferred).not.toEqual(expect.arrayContaining(["React"]));
  });
});

describe("computeCopilotJobMatch", () => {
  it("1. match Full Stack forte → APPLY", () => {
    const match = computeCopilotJobMatch(gustavoProfile, FULL_STACK_JOB);
    expect(match.score).toBeGreaterThanOrEqual(85);
    expect(match.decision).toBe("apply");
    expect(match.matchedSkills).toEqual(expect.arrayContaining(["React", "TypeScript", "Node.js", "PostgreSQL"]));
    expect(match.strengths.length).toBeGreaterThan(0);
    expect(match.roleFit.fullstack).toBeGreaterThanOrEqual(match.roleFit.frontend);
    expect(match.explanation).toMatch(/APPLY/i);
    expect(match.scoringVersion).toBe("copilot-v1");
  });

  it("2. match parcial com skill não declarada → UNKNOWN, não gap", () => {
    const match = computeCopilotJobMatch(gustavoProfile, PARTIAL_JOB);
    expect(match.score).toBeLessThan(85);
    expect(match.requiredUnknown).toEqual(expect.arrayContaining(["Kubernetes"]));
    expect(match.requiredMissing).not.toEqual(expect.arrayContaining(["Kubernetes"]));
    expect(match.unknownSkills).toEqual(expect.arrayContaining(["Kubernetes"]));
    expect(match.gaps.join(" ")).not.toMatch(/Kubernetes/i);
    expect(match.explanation).toMatch(/sem evidência/i);
  });

  it("skill com zero explícito é gap comprovado, não UNKNOWN", () => {
    const match = computeCopilotJobMatch(gustavoProfile, INCOMPATIBLE_JOB);
    expect(match.requiredMissing).toEqual(expect.arrayContaining(["Elixir"]));
    expect(match.requiredUnknown).not.toEqual(expect.arrayContaining(["Elixir"]));
    expect(match.gaps.join(" ")).toMatch(/Elixir/i);
    expect(match.decision).toBe("skip");
  });

  it("skill atendida entra em matched e não em unknown nem missing", () => {
    const match = computeCopilotJobMatch(gustavoProfile, FULL_STACK_JOB);
    expect(match.requiredMatched).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(match.requiredMissing).not.toEqual(expect.arrayContaining(["React"]));
    expect(match.requiredUnknown).not.toEqual(expect.arrayContaining(["React"]));
  });

  it("perfil quase vazio não recebe recomendação forte por falta de requisitos avaliáveis", () => {
    const emptyish = validateCandidateProfile({
      name: "Ana Costa",
      roles: ["Product Engineer"],
      skills: {},
      salary: {},
      answerBank: EMPTY_ANSWER_BANK,
      facts: {},
    });
    const match = computeCopilotJobMatch(emptyish, PARTIAL_JOB);
    expect(match.requiredMatched).toEqual([]);
    expect(match.requiredUnknown.length).toBeGreaterThan(0);
    expect(match.score).toBeLessThan(70);
    expect(match.decision).toBe("needs_info");
  });

  it("3. vaga incompatível → SKIP", () => {
    const match = computeCopilotJobMatch(gustavoProfile, INCOMPATIBLE_JOB);
    expect(match.score).toBeLessThan(70);
    expect(match.decision).toBe("skip");
    expect(match.missingSkills.length).toBeGreaterThan(0);
  });

  it("é determinístico para o mesmo perfil e texto", () => {
    const a = computeCopilotJobMatch(gustavoProfile, FULL_STACK_JOB);
    const b = computeCopilotJobMatch(gustavoProfile, FULL_STACK_JOB);
    expect(a).toEqual(b);
  });

  it("não usa só quantidade de keywords (required pesa mais que preferred)", () => {
    const match = computeCopilotJobMatch(gustavoProfile, FULL_STACK_JOB);
    expect(match.requiredMatched.length).toBeGreaterThan(0);
    expect(match.explanation).toMatch(/required/i);
    expect(match.explanation).toMatch(/não são o único factor/i);
  });
});
