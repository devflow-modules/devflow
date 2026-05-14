export type AtsRewrittenBullet = {
  original: string;
  improved: string;
};

export type AtsPracticeContext = {
  resumeSummary: string;
  jobSummary: string;
  strengthsToDefend: string[];
  gapsToPrepare: string[];
  suggestedPitch: string;
};

export type AtsAnalysisResult = {
  overallScore: number;
  technicalScore: number;
  seniorityScore: number;
  keywordCoverageScore: number;
  interviewReadinessScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  weakSignals: string[];
  strengths: string[];
  improvementSuggestions: string[];
  rewrittenBullets: AtsRewrittenBullet[];
  likelyInterviewQuestions: string[];
  practiceContext: AtsPracticeContext;
};
