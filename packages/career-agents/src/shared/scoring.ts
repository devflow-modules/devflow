import type { CareerSkill } from "./types.js";

export type AtsScoreBreakdown = {
  requiredScore: number;
  niceToHaveScore: number;
  evidenceScore: number;
};

function matchCount(names: string[], resumeSet: Set<string>): number {
  return names.filter((name) => resumeSet.has(name.toLowerCase())).length;
}

/** Deterministic ATS score 0–100 from required/nice skill coverage. */
export function computeAtsScore(params: {
  requiredJobSkills: CareerSkill[];
  niceJobSkills: CareerSkill[];
  resumeSkillNames: string[];
}): number {
  return computeAtsScoreWithBreakdown(params).score;
}

export function computeAtsScoreWithBreakdown(params: {
  requiredJobSkills: CareerSkill[];
  niceJobSkills: CareerSkill[];
  resumeSkillNames: string[];
  skillEvidence?: Record<string, "strong" | "weak" | "listed">;
}): { score: number; breakdown: AtsScoreBreakdown } {
  const resumeSet = new Set(params.resumeSkillNames.map((s) => s.toLowerCase()));

  const requiredNames = params.requiredJobSkills.map((s) => s.name);
  const niceNames = params.niceJobSkills.map((s) => s.name);
  const allJobNames = [...requiredNames, ...niceNames];

  if (allJobNames.length === 0) {
    const fallback = resumeSet.size > 0 ? 50 : 0;
    return {
      score: fallback,
      breakdown: { requiredScore: fallback, niceToHaveScore: 0, evidenceScore: 0 },
    };
  }

  const requiredMatched = matchCount(requiredNames, resumeSet);
  const niceMatched = matchCount(niceNames, resumeSet);

  const requiredTotal = requiredNames.length;
  const niceTotal = niceNames.length;

  const requiredRatio = requiredTotal > 0 ? requiredMatched / requiredTotal : 0;
  const niceRatio = niceTotal > 0 ? niceMatched / niceTotal : 0;

  let requiredScore: number;
  let niceToHaveScore: number;
  let score: number;

  if (requiredTotal > 0) {
    requiredScore = Math.round(requiredRatio * 80);
    niceToHaveScore = Math.round(niceRatio * 20);
    score = requiredScore + niceToHaveScore;
  } else {
    requiredScore = 0;
    niceToHaveScore = Math.round(niceRatio * 100);
    score = niceToHaveScore;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  const matchedNames = allJobNames.filter((name) => resumeSet.has(name.toLowerCase()));
  const evidence = params.skillEvidence ?? {};
  const strongMatched = matchedNames.filter(
    (name) => evidence[name.toLowerCase()] === "strong" || evidence[name] === "strong",
  ).length;
  const evidenceScore =
    matchedNames.length > 0 ? Math.round((strongMatched / matchedNames.length) * 100) : 0;

  return {
    score,
    breakdown: {
      requiredScore,
      niceToHaveScore,
      evidenceScore,
    },
  };
}
