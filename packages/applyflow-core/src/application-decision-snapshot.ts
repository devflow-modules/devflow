import { APPLICATION_DECISIONS, type ApplicationDecision, type FitDimensionsV2, type JobDecisionV2 } from "./application-decision-types.js";
import type { ApplicationPackV2 } from "./application-pack-v2.js";
import { EVIDENCE_MATCH_STATUSES, type EvidenceMatchStatus } from "./evidence-matching.js";
import { JOB_REQUIREMENT_CATEGORIES, type JobRequirementCategory } from "./job-requirement-types.js";

export type ApplicationRequirementSnapshot = {
  id: string;
  label: string;
  category: JobRequirementCategory;
  status: EvidenceMatchStatus;
};

/** Immutable scores + IDs captured at application time. No pack texts. */
export type ApplicationDecisionSnapshot = {
  capturedAt: string;
  overallFit: number;
  dimensions: FitDimensionsV2;
  decision: ApplicationDecision;
  priority: number;
  requirements: ApplicationRequirementSnapshot[];
  resumeVariant?: string;
  supportingEvidenceIds: string[];
  primaryCaseIds: string[];
};

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.filter((item) => item.trim().length > 0))];
}

export function evidenceIdsFromApplicationPackV2(pack: ApplicationPackV2): string[] {
  const fromAnswers = (pack.applicationAnswers ?? []).flatMap((item) => item.supportingEvidenceIds ?? []);
  const fromCv = [
    ...(pack.cvPersonalization?.experienceChanges ?? []),
    ...(pack.cvPersonalization?.skillsChanges ?? []),
  ].flatMap((item) => item.supportingEvidenceIds ?? []);
  const fromClaims = (pack.claimAudit?.finalSafe ?? []).flatMap((item) =>
    (item.supportingEvidence ?? []).map((ev) => ev.id),
  );
  return uniqueIds([...fromAnswers, ...fromCv, ...fromClaims]);
}

export function caseIdsFromApplicationPackV2(pack: ApplicationPackV2): string[] {
  return uniqueIds(pack.interviewBrief?.recommendedCases.flatMap((item) => item.evidenceIds) ?? []);
}

export function captureApplicationDecisionSnapshot(input: {
  decision: JobDecisionV2;
  resumeVariant?: string;
  supportingEvidenceIds?: readonly string[];
  primaryCaseIds?: readonly string[];
  pack?: ApplicationPackV2;
  now?: Date;
}): ApplicationDecisionSnapshot {
  const dimensions = { ...input.decision.dimensions };
  return {
    capturedAt: (input.now ?? new Date()).toISOString(),
    overallFit: input.decision.overall,
    dimensions,
    decision: input.decision.decision,
    priority: input.decision.priority,
    requirements: input.decision.matches.map((item) => ({
      id: item.requirement.id,
      label: item.requirement.label,
      category: item.requirement.category,
      status: item.status,
    })),
    ...(input.resumeVariant || input.pack?.resumeRecommendation?.variant.id
      ? { resumeVariant: input.resumeVariant ?? input.pack?.resumeRecommendation?.variant.id }
      : {}),
    supportingEvidenceIds: uniqueIds([
      ...(input.supportingEvidenceIds ?? []),
      ...(input.pack ? evidenceIdsFromApplicationPackV2(input.pack) : []),
    ]),
    primaryCaseIds: uniqueIds([
      ...(input.primaryCaseIds ?? []),
      ...(input.pack ? caseIdsFromApplicationPackV2(input.pack) : []),
    ]),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseDimensions(raw: unknown): FitDimensionsV2 | undefined {
  if (!isRecord(raw)) return undefined;
  if (
    typeof raw.overall !== "number" ||
    typeof raw.coreEngineering !== "number" ||
    typeof raw.stack !== "number" ||
    typeof raw.specialization !== "number" ||
    typeof raw.seniority !== "number" ||
    typeof raw.product !== "number"
  ) {
    return undefined;
  }
  return {
    overall: raw.overall,
    coreEngineering: raw.coreEngineering,
    stack: raw.stack,
    specialization: raw.specialization,
    seniority: raw.seniority,
    product: raw.product,
    ...(typeof raw.cloud === "number" ? { cloud: raw.cloud } : {}),
    ...(typeof raw.ai === "number" ? { ai: raw.ai } : {}),
    ...(typeof raw.language === "number" ? { language: raw.language } : {}),
  };
}

function parseRequirement(raw: unknown): ApplicationRequirementSnapshot | undefined {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.label !== "string") return undefined;
  if (!JOB_REQUIREMENT_CATEGORIES.includes(raw.category as JobRequirementCategory)) return undefined;
  if (!EVIDENCE_MATCH_STATUSES.includes(raw.status as EvidenceMatchStatus)) return undefined;
  return {
    id: raw.id,
    label: raw.label,
    category: raw.category as JobRequirementCategory,
    status: raw.status as EvidenceMatchStatus,
  };
}

/** Accepts only scores + IDs. Generated pack texts are ignored. */
export function parseApplicationDecisionSnapshot(raw: unknown): ApplicationDecisionSnapshot | undefined {
  if (!isRecord(raw) || typeof raw.capturedAt !== "string" || typeof raw.overallFit !== "number") return undefined;
  if (!APPLICATION_DECISIONS.includes(raw.decision as ApplicationDecision)) return undefined;
  if (typeof raw.priority !== "number") return undefined;
  const dimensions = parseDimensions(raw.dimensions);
  if (!dimensions || !Array.isArray(raw.requirements)) return undefined;
  const requirements = raw.requirements
    .map(parseRequirement)
    .filter((item): item is ApplicationRequirementSnapshot => Boolean(item));
  return {
    capturedAt: raw.capturedAt,
    overallFit: raw.overallFit,
    dimensions,
    decision: raw.decision as ApplicationDecision,
    priority: raw.priority,
    requirements,
    ...(typeof raw.resumeVariant === "string" ? { resumeVariant: raw.resumeVariant } : {}),
    supportingEvidenceIds: Array.isArray(raw.supportingEvidenceIds)
      ? uniqueIds(raw.supportingEvidenceIds.filter((item): item is string => typeof item === "string"))
      : [],
    primaryCaseIds: Array.isArray(raw.primaryCaseIds)
      ? uniqueIds(raw.primaryCaseIds.filter((item): item is string => typeof item === "string"))
      : [],
  };
}
