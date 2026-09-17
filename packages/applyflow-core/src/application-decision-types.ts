import type { ClaimAudit } from "./claim-safety.js";
import type { EvidenceMatch } from "./evidence-matching.js";
import type { ApplicationGate } from "./application-gates.js";
import type { CandidateInputRequest } from "./candidate-input.js";
import type { Confidence } from "./types.js";

export const APPLICATION_DECISIONS = ["apply_high", "apply_normal", "apply_stretch", "needs_info", "skip"] as const;
export type ApplicationDecision = (typeof APPLICATION_DECISIONS)[number];

export const INCOMPLETE_ANALYSIS_MESSAGE = "Complete seu perfil para concluir a análise";

export function isInconclusiveDecision(decision: ApplicationDecision): boolean {
  return decision === "needs_info";
}

export function isRecommendedApplyDecision(decision: ApplicationDecision): boolean {
  return decision === "apply_high" || decision === "apply_normal" || decision === "apply_stretch";
}

export const HIRING_PROBABILITY = ["low", "medium", "high"] as const;
export type HiringProbability = (typeof HIRING_PROBABILITY)[number];

export const CAREER_UPSIDE = ["low", "medium", "high", "very_high"] as const;
export type CareerUpside = (typeof CAREER_UPSIDE)[number];

export const APPLICATION_COST = ["low", "medium", "high"] as const;
export type ApplicationCost = (typeof APPLICATION_COST)[number];

export const OPPORTUNITY_COST = ["low", "medium", "high"] as const;
export type OpportunityCost = (typeof OPPORTUNITY_COST)[number];

export const ELIMINATION_RISK = ["low", "medium", "high"] as const;
export type EliminationRisk = (typeof ELIMINATION_RISK)[number];

export const DECISION_PRIORITY = ["fit", "hiring_probability", "career_upside", "opportunity_cost", "risk", "priority"] as const;
export type DecisionAxis = (typeof DECISION_PRIORITY)[number];

export type FitDimensionsV2 = {
  overall: number;
  coreEngineering: number;
  stack: number;
  specialization: number;
  seniority: number;
  product: number;
  cloud?: number;
  ai?: number;
  language?: number;
};

export type JobDecisionV2 = {
  scoringVersion: "v2";
  decision: ApplicationDecision;
  overall: number;
  dimensions: FitDimensionsV2;
  confidence: Confidence;
  hiringProbability: HiringProbability;
  careerUpside: CareerUpside;
  applicationCost: ApplicationCost;
  opportunityCost: OpportunityCost;
  eliminationRisk: EliminationRisk;
  priority: number;
  matches: EvidenceMatch[];
  claims: ClaimAudit[];
  recommendedClaims: ClaimAudit[];
  gates: ApplicationGate[];
  candidateInputRequests: CandidateInputRequest[];
  reasons: string[];
};
