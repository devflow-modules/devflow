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

/** APPLY/STRETCH enter the existing funnel as reviewing; SKIP as ignored. */
export function statusFromJobMatchDecision(
  decision: JobMatchDecision,
): "reviewing" | "ignored" {
  return decision === "skip" ? "ignored" : "reviewing";
}
