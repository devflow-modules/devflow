import type { JobMatchDecision } from "./job-match-types.js";

/** Versioned F1 thresholds. Recalibration must bump `scoringVersion`, not mutate v1 history. */
export const JOB_MATCH_THRESHOLDS_V1 = {
  apply: 80,
  stretch: 55,
} as const;

export function decideJobMatchV1(score: number): JobMatchDecision {
  if (score >= JOB_MATCH_THRESHOLDS_V1.apply) return "apply";
  if (score >= JOB_MATCH_THRESHOLDS_V1.stretch) return "stretch";
  return "skip";
}

/** Score-only threshold, then UNKNOWN vs explicit gaps. */
export function decideJobMatchV1WithCoverage(input: {
  score: number;
  unknownCount: number;
  missingCount: number;
  jobSkillCount: number;
}): JobMatchDecision {
  const scored = decideJobMatchV1(input.score);
  if (scored === "apply") return "apply";
  const unknownRatio = input.jobSkillCount > 0 ? input.unknownCount / input.jobSkillCount : 0;
  if (input.missingCount === 0 && input.unknownCount > 0 && (input.unknownCount === input.jobSkillCount || unknownRatio >= 0.5 || scored === "skip")) {
    return "needs_info";
  }
  return scored;
}

/** APPLY/STRETCH/NEEDS_INFO enter the funnel as reviewing; SKIP as ignored. */
export function statusFromJobMatchDecision(
  decision: JobMatchDecision,
): "reviewing" | "ignored" {
  return decision === "skip" ? "ignored" : "reviewing";
}
