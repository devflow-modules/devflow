import { describe, expect, it } from "vitest";
import { calculateFitScore } from "../fit-score.js";

describe("calculateFitScore", () => {
  it("texto vazio → 0", () => {
    const r = calculateFitScore("");
    expect(r.score).toBe(0);
    expect(r.matchedSkills).toEqual([]);
  });

  it("detecta várias skills do perfil", () => {
    const text = `
      We need React, Next.js, TypeScript, Node.js, PostgreSQL, Docker and Git.
      Tailwind and Prisma are a plus.
    `;
    const r = calculateFitScore(text);
    expect(r.matchedSkills).toEqual(
      expect.arrayContaining(["react", "nextjs", "typescript", "nodejs", "postgresql", "docker", "git", "tailwind", "prisma"]),
    );
    expect(r.score).toBeGreaterThan(30);
  });

  it("texto curto reduz confiança", () => {
    const r = calculateFitScore("react");
    expect(r.confidence).toBe("low");
  });
});
