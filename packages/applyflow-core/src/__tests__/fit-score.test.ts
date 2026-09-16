import { describe, expect, it } from "vitest";

import { calculateFitScore } from "../fit-score.js";
import { extractJobIntelligence } from "../job-intelligence.js";
import { evaluateJobMatch } from "../evaluate-job-match.js";
import { gustavoProfile } from "../candidate-profile.js";

describe("calculateFitScore", () => {
  it("texto vazio → 0", () => {
    const r = calculateFitScore("");
    expect(r.score).toBe(0);
    expect(r.matchedSkills).toEqual([]);
  });

  it("sem perfil não usa dados de referência", () => {
    const r = calculateFitScore("React TypeScript Next.js Node.js");
    expect(r.score).toBe(0);
    expect(r.matchedSkills).toEqual([]);
    expect(r.confidence).toBe("low");
  });

  it("delega para evaluateJobMatch", () => {
    const text = `
      We need React, Next.js, TypeScript, Node.js, PostgreSQL, Docker and Git.
      Tailwind and Prisma are a plus.
    `;
    const r = calculateFitScore(text, gustavoProfile);
    const intel = extractJobIntelligence(text);
    const match = evaluateJobMatch(gustavoProfile, { skills: intel.detectedSkills });
    expect(r.score).toBe(match.score);
    expect(r.matchedSkills).toEqual(match.matchedSkills);
    expect(r.missingHighlights).toEqual(match.missingSkills);
    expect(r.score).toBeGreaterThan(30);
  });

  it("texto curto reduz confiança", () => {
    const r = calculateFitScore("react", gustavoProfile);
    expect(r.confidence).toBe("low");
  });
});
