import { auditClaims, recommendedClaims } from "./claim-safety.js";
import { buildCandidateInputRequests } from "./candidate-input.js";
import { evaluateApplicationGates, hasFailingRequiredGate } from "./application-gates.js";
import type { Evidence } from "./evidence-types.js";
import { matchRequirementsToEvidence, type EvidenceMatch } from "./evidence-matching.js";
import { extractJobRequirements } from "./extract-job-requirements.js";
import type { JobRequirementCategory } from "./job-requirement-types.js";
import { REQUIREMENT_IMPORTANCE_WEIGHTS } from "./job-requirement-types.js";
import type { CandidateProfile } from "./profile-schema.js";
import type { Confidence } from "./types.js";
import {
  INCOMPLETE_ANALYSIS_MESSAGE,
  type ApplicationCost,
  type ApplicationDecision,
  type CareerUpside,
  type FitDimensionsV2,
  type HiringProbability,
  type JobDecisionV2,
  type OpportunityCost,
  type EliminationRisk,
} from "./application-decision-types.js";

export const JOB_DECISION_SCORING_VERSION_V2 = "v2" as const;

const STATUS_POINTS = {
  proven: 100,
  partial: 52,
  gap: 8,
} as const;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isNonTechnicalRequirement(match: EvidenceMatch): boolean {
  return (
    match.requirement.requirementType === "salary" ||
    match.requirement.requirementType === "schedule" ||
    match.requirement.requirementType === "work_model"
  );
}

function weightedScore(matches: readonly EvidenceMatch[]): { score: number | undefined; known: number; unknown: number; weight: number } {
  let weighted = 0;
  let weight = 0;
  let unknown = 0;
  for (const match of matches) {
    if (isNonTechnicalRequirement(match)) continue;
    const w = REQUIREMENT_IMPORTANCE_WEIGHTS[match.requirement.importance];
    if (match.status === "unknown") {
      unknown += w;
      continue;
    }
    weighted += STATUS_POINTS[match.status] * w;
    weight += w;
  }
  if (weight === 0) {
    return { score: unknown > 0 ? 40 : undefined, known: 0, unknown, weight: 0 };
  }
  const coverage = weight / (weight + unknown);
  return { score: clamp((weighted / weight) * coverage), known: weight, unknown, weight };
}

function byCategory(matches: readonly EvidenceMatch[], categories: readonly JobRequirementCategory[]): EvidenceMatch[] {
  return matches.filter((item) => categories.includes(item.requirement.category));
}

function dimensionScore(matches: readonly EvidenceMatch[], categories: readonly JobRequirementCategory[]): number | undefined {
  return weightedScore(byCategory(matches, categories)).score;
}

function scoreDimensions(matches: readonly EvidenceMatch[]): FitDimensionsV2 {
  const overall = weightedScore(matches).score ?? 40;
  const cloud = dimensionScore(matches, ["cloud"]);
  const ai = dimensionScore(matches, ["ai"]);
  const language = dimensionScore(matches, ["language"]);
  return {
    overall,
    coreEngineering: dimensionScore(matches, ["core_engineering"]) ?? overall,
    stack: dimensionScore(matches, ["frontend", "backend"]) ?? overall,
    specialization: dimensionScore(matches, ["ai", "data", "cloud", "domain"]) ?? dimensionScore(matches, ["backend"]) ?? overall,
    seniority: dimensionScore(matches, ["seniority"]) ?? overall,
    product: dimensionScore(matches, ["product"]) ?? overall,
    ...(cloud !== undefined ? { cloud } : {}),
    ...(ai !== undefined ? { ai } : {}),
    ...(language !== undefined ? { language } : {}),
  };
}

function confidenceFrom(matches: readonly EvidenceMatch[], jobText: string): Confidence {
  const stats = weightedScore(matches);
  const unknownRatio = stats.unknown / Math.max(1, stats.known + stats.unknown);
  if (jobText.trim().length < 80 || unknownRatio >= 0.5 || stats.known === 0) return "low";
  if (unknownRatio >= 0.28) return "medium";
  return "high";
}

function bandFromScore(score: number | undefined, high: number, mid: number): "low" | "medium" | "high" {
  if (score === undefined) return "medium";
  if (score >= high) return "high";
  if (score >= mid) return "medium";
  return "low";
}

function careerUpside(dimensions: FitDimensionsV2, matches: readonly EvidenceMatch[]): CareerUpside {
  const stretchAi = dimensions.ai !== undefined && dimensions.ai < 45 && dimensions.coreEngineering >= 75;
  const stretchCloud = dimensions.cloud !== undefined && dimensions.cloud < 45 && dimensions.product >= 70;
  const productStrong = dimensions.product >= 80 && dimensions.coreEngineering >= 75;
  if ((stretchAi || stretchCloud) && productStrong) return "very_high";
  if (productStrong && dimensions.overall >= 70) return "high";
  if (dimensions.overall >= 55 && dimensions.specialization >= 40) return "medium";
  if (matches.some((item) => item.requirement.category === "ai" || item.requirement.category === "cloud")) {
    return dimensions.coreEngineering >= 70 ? "high" : "medium";
  }
  return dimensions.overall >= 50 ? "medium" : "low";
}

function eliminationRisk(input: {
  dimensions: FitDimensionsV2;
  matches: readonly EvidenceMatch[];
  failedRequiredGate: boolean;
}): EliminationRisk {
  if (input.failedRequiredGate) return "high";
  const fundamentalGaps = input.matches.filter(
    (item) => item.requirement.importance === "fundamental" && item.status === "gap",
  ).length;
  if (fundamentalGaps >= 2 || input.dimensions.specialization <= 35) return "high";
  if (fundamentalGaps === 1 || input.dimensions.overall < 60) return "medium";
  return "low";
}

function decide(input: {
  overall: number;
  dimensions: FitDimensionsV2;
  hiring: HiringProbability;
  upside: CareerUpside;
  risk: EliminationRisk;
  failedRequiredGate: boolean;
  confidence: Confidence;
}): { decision: ApplicationDecision; reasons: string[] } {
  const reasons: string[] = [];
  if (input.failedRequiredGate) {
    reasons.push("Required gate failed — APPLY decisions are downgraded to SKIP. No auto-submit.");
    return { decision: "skip", reasons };
  }

  if (input.overall >= 75 && input.risk === "high" && (input.upside === "very_high" || input.upside === "high")) {
    reasons.push("Fit is solid but risk is high; career upside justifies APPLY_STRETCH.");
    return { decision: "apply_stretch", reasons };
  }

  if (
    input.dimensions.coreEngineering >= 75 &&
    input.dimensions.product >= 70 &&
    input.overall >= 55 &&
    (input.upside === "high" || input.upside === "very_high")
  ) {
    reasons.push("Core engineering and product are strong; remaining gaps are a stretch, not a skip.");
    return { decision: input.risk === "high" ? "apply_stretch" : "apply_normal", reasons };
  }

  if (input.overall < 60 && input.risk === "high" && (input.upside === "low" || input.upside === "medium")) {
    reasons.push("Fit is modest, elimination risk is high, and upside does not justify the cost.");
    return { decision: "skip", reasons };
  }

  if (input.dimensions.specialization <= 40 && input.dimensions.stack <= 55 && input.overall < 62) {
    reasons.push("Specialization and stack coverage are too weak for a responsible apply.");
    return { decision: "skip", reasons };
  }

  if (input.confidence === "low" && input.overall < 70) {
    reasons.push("Too little posting information for a strong apply; treat as review, not a high-confidence APPLY.");
  }

  if (input.overall >= 82 && input.risk !== "high" && input.hiring !== "low") {
    reasons.push("Strong weighted coverage of fundamental requirements.");
    return { decision: "apply_high", reasons };
  }

  if (input.overall >= 68 && input.risk !== "high") {
    reasons.push("Good coverage with acceptable risk.");
    return { decision: "apply_normal", reasons };
  }

  if (input.overall >= 58 && (input.upside === "high" || input.upside === "very_high")) {
    reasons.push("Coverage is incomplete, but the role is a justified stretch.");
    return { decision: "apply_stretch", reasons };
  }

  if (input.overall >= 68 && input.risk === "high" && input.upside !== "low") {
    reasons.push("Fit is usable but risk is material — stretch, not a default apply.");
    return { decision: "apply_stretch", reasons };
  }

  reasons.push("Fit, risk, and upside do not support applying.");
  return { decision: "skip", reasons };
}

function defaultClaims(jobText: string, matches: readonly EvidenceMatch[]): string[] {
  const claims: string[] = [];
  const firstLine = jobText.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (firstLine && firstLine.length < 120) claims.push(firstLine);
  for (const match of matches) {
    if (match.requirement.importance === "fundamental" || match.requirement.category === "ai" || match.requirement.category === "cloud") {
      claims.push(match.requirement.label);
    }
  }
  return [...new Set(claims)].slice(0, 12);
}

export function incompleteAnalysisFacts(input: {
  matches: readonly EvidenceMatch[];
  gates: readonly { label: string; result: string; required?: boolean; type?: string }[];
}): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (label: string) => {
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    facts.push(label);
  };
  for (const item of input.matches) {
    if (item.status !== "unknown") continue;
    if (item.requirement.requirementType === "salary" || item.requirement.requirementType === "schedule") continue;
    push(item.requirement.label);
  }
  for (const gate of input.gates) {
    if (gate.result !== "unknown") continue;
    if (gate.type === "salary" || gate.type === "hours") continue;
    push(gate.label);
  }
  return facts.slice(0, 8);
}

/**
 * Career OS V2 decision. Does not replace `calculateFitScore` / `evaluateJobMatch`.
 * Deterministic, local, no network, no auto-submit.
 */
export function evaluateJobDecisionV2(input: {
  jobText: string;
  evidence: readonly Evidence[];
  profile?: CandidateProfile;
  claims?: readonly string[];
  jobId?: string;
}): JobDecisionV2 {
  const requirements = extractJobRequirements(input.jobText);
  const matches = matchRequirementsToEvidence(requirements, input.evidence, { jobId: input.jobId });
  const dimensions = scoreDimensions(matches);
  const confidence = confidenceFrom(matches, input.jobText);
  const gates = evaluateApplicationGates({ jobText: input.jobText, profile: input.profile, matches });
  const failedRequiredGate = hasFailingRequiredGate(gates);
  const hiring = bandFromScore(dimensions.overall, 80, 62) as HiringProbability;
  const upside = careerUpside(dimensions, matches);
  const risk = eliminationRisk({ dimensions, matches, failedRequiredGate });
  const isNonTechnicalUnknown = (item: EvidenceMatch) =>
    item.requirement.requirementType === "salary" ||
    item.requirement.requirementType === "schedule" ||
    item.requirement.requirementType === "work_model";
  const unknownCount = matches.filter((item) => item.status === "unknown" && !isNonTechnicalUnknown(item)).length;
  const gapCount = matches.filter((item) => item.status === "gap").length;
  const applicationCost: ApplicationCost = gapCount + unknownCount >= 6 ? "high" : gapCount + unknownCount >= 3 ? "medium" : "low";
  const opportunityCost: OpportunityCost =
    hiring === "low" && risk === "high" ? "high" : hiring === "high" && risk === "low" ? "low" : "medium";
  const stats = weightedScore(matches);
  const unknownRatio = stats.unknown / Math.max(1, stats.known + stats.unknown);
  let { decision, reasons } = decide({
    overall: dimensions.overall,
    dimensions,
    hiring,
    upside,
    risk,
    failedRequiredGate,
    confidence,
  });
  const provenIncompatible =
    failedRequiredGate ||
    matches.some(
      (item) =>
        item.status === "gap" &&
        (item.requirement.mandatory || item.requirement.importance === "fundamental"),
    );
  const provenCount = matches.filter((item) => item.status === "proven").length;
  const missingFacts = incompleteAnalysisFacts({ matches, gates });
  const incompleteReasons = [
    `${INCOMPLETE_ANALYSIS_MESSAGE}.`,
    ...(missingFacts.length > 0 ? [`Faltam dados relevantes: ${missingFacts.join(", ")}.`] : []),
  ];
  if (!provenIncompatible) {
    if (stats.known === 0 || (unknownRatio >= 0.5 && provenCount === 0)) {
      decision = "needs_info";
      reasons = incompleteReasons;
    } else if (decision === "skip" && gapCount === 0 && unknownCount > 0) {
      decision = "needs_info";
      reasons = incompleteReasons;
    } else if ((decision === "apply_high" || decision === "apply_normal") && unknownRatio >= 0.5) {
      decision = "apply_stretch";
      reasons = [...reasons, "Muitos requisitos estão sem evidência. Isso não é uma recomendação forte de candidatura."];
    }
  }
  const claims = auditClaims(input.claims ?? defaultClaims(input.jobText, matches), input.evidence);
  const candidateInputRequests = buildCandidateInputRequests({ matches, jobId: input.jobId });
  const priority =
    decision === "skip"
      ? 20
      : decision === "needs_info"
        ? 25
        : decision === "apply_stretch"
          ? 55
          : decision === "apply_normal"
            ? 75
            : 90;

  return {
    scoringVersion: JOB_DECISION_SCORING_VERSION_V2,
    decision,
    overall: dimensions.overall,
    dimensions,
    confidence,
    hiringProbability: hiring,
    careerUpside: upside,
    applicationCost,
    opportunityCost,
    eliminationRisk: risk,
    priority,
    matches,
    claims,
    recommendedClaims: recommendedClaims(claims),
    gates,
    candidateInputRequests,
    reasons,
  };
}
