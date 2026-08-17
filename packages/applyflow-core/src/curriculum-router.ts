import { evaluateJobMatch } from "./evaluate-job-match.js";
import {
  CURRICULUM_ROUTER_DELTA_BANDS_V1,
  CURRICULUM_ROUTER_VERSION,
  JOB_MATCH_SCORING_VERSION,
  type CurriculumRecommendation,
  type CurriculumRouterConfidence,
  type NormalizedJobSkills,
  type ResumeMatchCandidate,
} from "./job-match-types.js";
import type { ResumeLibrary } from "./resume-library-types.js";

/**
 * Deterministic rank: higher score, then more matched skills, then fewer missing
 * skills, then the current default, then stable `variantId`. Default never
 * mutates `score`.
 */
export function compareResumeMatchCandidates(
  a: ResumeMatchCandidate,
  b: ResumeMatchCandidate,
  defaultVariantId: string,
): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.matchedSkills.length !== b.matchedSkills.length) {
    return b.matchedSkills.length - a.matchedSkills.length;
  }
  if (a.missingSkills.length !== b.missingSkills.length) {
    return a.missingSkills.length - b.missingSkills.length;
  }
  const aDefault = a.variantId === defaultVariantId ? 0 : 1;
  const bDefault = b.variantId === defaultVariantId ? 0 : 1;
  if (aDefault !== bDefault) return aDefault - bDefault;
  if (a.variantId < b.variantId) return -1;
  if (a.variantId > b.variantId) return 1;
  return 0;
}

export function rankResumeMatchCandidates(
  candidates: readonly ResumeMatchCandidate[],
  defaultVariantId: string,
): ResumeMatchCandidate[] {
  return [...candidates].sort((left, right) => compareResumeMatchCandidates(left, right, defaultVariantId));
}

export function classifyCurriculumRouterConfidence(scoreDelta: number): CurriculumRouterConfidence {
  if (scoreDelta >= CURRICULUM_ROUTER_DELTA_BANDS_V1.clear) return "clear";
  if (scoreDelta >= CURRICULUM_ROUTER_DELTA_BANDS_V1.moderate) return "moderate";
  return "equivalent";
}

function toCandidate(
  variant: ResumeLibrary["variants"][number],
  job: NormalizedJobSkills,
  now: Date,
): ResumeMatchCandidate {
  const match = evaluateJobMatch(variant.profile, job, { now });
  return {
    variantId: variant.id,
    variantName: variant.name,
    score: match.score,
    decision: match.decision,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  };
}

/**
 * Rank every resume variant against one job. Returns `undefined` when there is
 * only one variant — a single résumé is not a recommendation.
 */
export function recommendCurriculum(
  job: NormalizedJobSkills,
  library: ResumeLibrary,
  options?: { now?: Date },
): CurriculumRecommendation | undefined {
  if (library.variants.length < 2) return undefined;

  const now = options?.now ?? new Date();
  const candidates = rankResumeMatchCandidates(
    library.variants.map((variant) => toCandidate(variant, job, now)),
    library.defaultVariantId,
  );
  const recommended = candidates[0];
  const runnerUp = candidates[1];
  if (!recommended || !runnerUp) return undefined;

  const scoreDelta = Math.max(0, recommended.score - runnerUp.score);

  return {
    recommendedVariantId: recommended.variantId,
    recommendedVariantName: recommended.variantName,
    evaluatedAt: now.toISOString(),
    scoringVersion: JOB_MATCH_SCORING_VERSION,
    routerVersion: CURRICULUM_ROUTER_VERSION,
    confidence: classifyCurriculumRouterConfidence(scoreDelta),
    scoreDelta,
    runnerUpVariantId: runnerUp.variantId,
    runnerUpVariantName: runnerUp.variantName,
    candidates,
  };
}
