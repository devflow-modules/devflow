export type HealthScoreLevel = "critical" | "warning" | "progress" | "good";

export type HealthScoreBreakdownItem = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
};

export type FinanceiroHealthScoreResult = {
  score: number;
  level: HealthScoreLevel;
  headlineLabel: string;
  breakdown: HealthScoreBreakdownItem[];
  ctaHint: string;
};
