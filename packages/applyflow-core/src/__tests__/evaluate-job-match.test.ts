import { describe, expect, it } from "vitest";

import { gustavoProfile } from "../candidate-profile.js";
import { evaluateJobMatch } from "../evaluate-job-match.js";
import { JOB_MATCH_THRESHOLDS_V1, decideJobMatchV1, statusFromJobMatchDecision } from "../job-match-thresholds.js";
import { JOB_MATCH_SCORING_VERSION } from "../job-match-types.js";

const NOW = new Date("2026-08-13T12:00:00.000Z");

describe("decideJobMatchV1", () => {
  it("aplica thresholds versionados", () => {
    expect(decideJobMatchV1(JOB_MATCH_THRESHOLDS_V1.apply)).toBe("apply");
    expect(decideJobMatchV1(79)).toBe("stretch");
    expect(decideJobMatchV1(JOB_MATCH_THRESHOLDS_V1.stretch)).toBe("stretch");
    expect(decideJobMatchV1(54)).toBe("skip");
  });
});

describe("statusFromJobMatchDecision", () => {
  it("APPLY/STRETCH → reviewing e SKIP → ignored", () => {
    expect(statusFromJobMatchDecision("apply")).toBe("reviewing");
    expect(statusFromJobMatchDecision("stretch")).toBe("reviewing");
    expect(statusFromJobMatchDecision("skip")).toBe("ignored");
  });
});

describe("evaluateJobMatch", () => {
  it("é determinístico para o mesmo perfil e skills", () => {
    const job = { skills: ["React", "TypeScript", "Kubernetes"] };
    const a = evaluateJobMatch(gustavoProfile, job, { now: NOW });
    const b = evaluateJobMatch(gustavoProfile, job, { now: NOW });
    expect(a).toEqual(b);
    expect(a.scoringVersion).toBe(JOB_MATCH_SCORING_VERSION);
    expect(a.evaluatedAt).toBe(NOW.toISOString());
  });

  it("APPLY quando a cobertura da vaga é forte", () => {
    const match = evaluateJobMatch(
      gustavoProfile,
      { skills: ["React", "Next.js", "TypeScript", "Node.js"] },
      { now: NOW },
    );
    expect(match.score).toBe(100);
    expect(match.decision).toBe("apply");
    expect(match.missingSkills).toEqual([]);
    expect(match.matchedSkills).toEqual(["React", "Next.js", "TypeScript", "Node.js"]);
  });

  it("STRETCH quando há gaps relevantes", () => {
    const match = evaluateJobMatch(
      gustavoProfile,
      { skills: ["React", "TypeScript", "Kubernetes"] },
      { now: NOW },
    );
    expect(match.score).toBe(67);
    expect(match.decision).toBe("stretch");
    expect(match.matchedSkills).toEqual(["React", "TypeScript"]);
    expect(match.missingSkills).toEqual(["Kubernetes"]);
  });

  it("SKIP quando a aderência é baixa", () => {
    const match = evaluateJobMatch(gustavoProfile, { skills: ["Java", "Elixir", "Ruby"] }, { now: NOW });
    expect(match.score).toBe(33);
    expect(match.decision).toBe("skip");
    expect(match.matchedSkills).toEqual(["Java"]);
    expect(match.missingSkills).toEqual(["Elixir", "Ruby"]);
  });

  it("score 0 e SKIP quando a vaga não tem skills", () => {
    const match = evaluateJobMatch(gustavoProfile, { skills: [] }, { now: NOW });
    expect(match.score).toBe(0);
    expect(match.decision).toBe("skip");
    expect(match.matchedSkills).toEqual([]);
    expect(match.missingSkills).toEqual([]);
  });

  it("aceita lista de labels (ats_analyst) com o mesmo motor", () => {
    const fromProfile = evaluateJobMatch(gustavoProfile, { skills: ["TypeScript", "Kubernetes"] }, { now: NOW });
    const fromLabels = evaluateJobMatch(
      ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker", "AWS"],
      { skills: ["TypeScript", "Kubernetes"] },
      { now: NOW },
    );
    expect(fromLabels.score).toBe(fromProfile.score);
    expect(fromLabels.decision).toBe(fromProfile.decision);
  });
});
