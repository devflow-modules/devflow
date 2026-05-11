export type Confidence = "high" | "medium" | "low";

export type SuggestedAnswer = {
  label: string;
  value: string;
  confidence: Confidence;
  warning?: string;
};

export type SalaryContext =
  | { kind: "clt_pleno" }
  | { kind: "clt_senior" }
  | { kind: "pj_senior" }
  | { kind: "usd_monthly" }
  | { kind: "usd_hourly" }
  | { kind: "generic" };

export type SalarySuggestion = {
  display: string;
  confidence: Confidence;
  warning?: string;
};

export type FitScoreResult = {
  score: number;
  matchedSkills: string[];
  missingHighlights?: string[];
  confidence: Confidence;
};
