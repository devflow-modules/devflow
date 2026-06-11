import type { CareerSkill } from "./types.js";

/** Deterministic ATS score 0–100 from required/nice skill coverage. */
export function computeAtsScore(params: {
  requiredJobSkills: CareerSkill[];
  niceJobSkills: CareerSkill[];
  resumeSkillNames: string[];
}): number {
  const resumeSet = new Set(params.resumeSkillNames.map((s) => s.toLowerCase()));

  const requiredNames = params.requiredJobSkills.map((s) => s.name);
  const niceNames = params.niceJobSkills.map((s) => s.name);
  const allJobNames = [...requiredNames, ...niceNames];

  if (allJobNames.length === 0) {
    return resumeSet.size > 0 ? 50 : 0;
  }

  const matchCount = (names: string[]) =>
    names.filter((name) => resumeSet.has(name.toLowerCase())).length;

  const requiredMatched = matchCount(requiredNames);
  const niceMatched = matchCount(niceNames);

  const requiredTotal = requiredNames.length;
  const niceTotal = niceNames.length;

  let score: number;
  if (requiredTotal > 0) {
    const requiredRatio = requiredMatched / requiredTotal;
    const niceRatio = niceTotal > 0 ? niceMatched / niceTotal : 0;
    score = requiredRatio * 80 + niceRatio * 20;
  } else {
    score = niceTotal > 0 ? (niceMatched / niceTotal) * 100 : 0;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}
