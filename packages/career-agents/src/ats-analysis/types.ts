export type GapSeverity = "high" | "medium" | "low";

export type AtsMatchOutput = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceGaps: string[];
  suggestedImprovements: string[];
  scoreBreakdown?: {
    requiredScore: number;
    niceToHaveScore: number;
    evidenceScore: number;
  };
  gapSeverity?: Array<{
    skill: string;
    severity: GapSeverity;
    reason: string;
  }>;
};
