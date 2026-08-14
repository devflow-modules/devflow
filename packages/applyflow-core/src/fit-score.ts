import { gustavoProfile } from "./candidate-profile.js";
import { extractJobIntelligence } from "./job-intelligence.js";
import { evaluateJobMatch } from "./evaluate-job-match.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { Confidence, FitScoreResult } from "./types.js";

/**
 * Adapter over `evaluateJobMatch`. Do not add a second scoring formula here.
 */
export function calculateFitScore(jobText: string, profile?: CandidateProfile): FitScoreResult {
  const p = profile ?? gustavoProfile;
  if (!jobText.trim()) {
    return { score: 0, matchedSkills: [], missingHighlights: [], confidence: "low" };
  }

  const intel = extractJobIntelligence(jobText);
  const match = evaluateJobMatch(p, { skills: intel.detectedSkills });

  let confidence: Confidence = "medium";
  if (jobText.length < 80) confidence = "low";
  if (match.matchedSkills.length >= 6) confidence = "high";

  return {
    score: match.score,
    matchedSkills: match.matchedSkills,
    missingHighlights: match.missingSkills,
    confidence,
  };
}
