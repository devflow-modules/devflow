import type { JobDecisionV2 } from "./application-decision-types.js";
import type { CompensationRecommendation } from "./compensation.js";
import type { Evidence } from "./evidence-types.js";
import { recommendCases, type CaseRecommendation } from "./case-match.js";
import { extractJobIntelligence } from "./job-intelligence.js";

export type InterviewBrief = {
  jobSummary: string;
  decisionSummary: string;
  strongestEvidence: string[];
  gaps: string[];
  transferableAreas: string[];
  riskyQuestions: string[];
  recommendedCases: CaseRecommendation[];
  salaryContext?: CompensationRecommendation;
};

export function buildInterviewBrief(input: {
  jobText: string;
  jobTitle?: string;
  companyName?: string;
  decision: JobDecisionV2;
  evidence: readonly Evidence[];
  salary?: CompensationRecommendation;
}): InterviewBrief {
  const intel = extractJobIntelligence(input.jobText);
  const title = input.jobTitle ?? "Role";
  const company = input.companyName ?? "Company";
  const strongest = input.evidence
    .filter((item) => item.usableForClaims && (item.confidence === "strong" || item.confidence === "verified"))
    .slice(0, 6)
    .map((item) => item.label);
  const gaps = input.decision.matches.filter((item) => item.status === "gap").map((item) => item.requirement.label);
  const transferable = input.decision.matches
    .filter((item) => item.status === "partial")
    .map((item) => `${item.requirement.label}: ${item.reason}`);
  const risky = [
    ...gaps.map((gap) => `If asked about ${gap}, do not convert a related skill into that experience.`),
    ...input.decision.claims.filter((item) => item.status === "remove").map((item) => `Do not claim: ${item.claim}`),
  ].slice(0, 8);

  const query = [title, intel.roleType, ...input.decision.matches.filter((item) => item.status === "proven").map((item) => item.requirement.label)].join(" ");

  return {
    jobSummary: `${title} at ${company}. ${intel.seniority} ${intel.roleType} ${intel.workModel}`.replace(/\s+/g, " ").trim(),
    decisionSummary: `${input.decision.decision.toUpperCase()} · fit ${input.decision.overall} · risk ${input.decision.eliminationRisk} · upside ${input.decision.careerUpside}`,
    strongestEvidence: strongest,
    gaps,
    transferableAreas: transferable.slice(0, 8),
    riskyQuestions: risky,
    recommendedCases: recommendCases({ evidence: input.evidence, query }),
    ...(input.salary ? { salaryContext: input.salary } : {}),
  };
}
