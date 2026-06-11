export type AtsMatchOutput = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  evidenceGaps: string[];
  suggestedImprovements: string[];
};
