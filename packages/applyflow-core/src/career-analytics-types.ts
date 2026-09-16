import type { ApplicationDecisionSnapshot } from "./application-decision-snapshot.js";
import type { ApplicationDecision } from "./application-decision-types.js";
import type { ApplyFlowApplicationV2Envelope } from "./application-record-v2.js";
import type { ApplyFlowApplicationStatus } from "./application-types.js";
import type { Contact, ContactInteraction } from "./contact-types.js";
import type { EvidenceMatchStatus } from "./evidence-matching.js";
import type { JobRequirementCategory } from "./job-requirement-types.js";
import type { ApplyFlowJob } from "./job-match-types.js";
import type { ApplyFlowPipelineStatusV2 } from "./pipeline-status.js";
import type { Confidence } from "./types.js";

export const REJECTION_REASON_CATEGORIES = [
  "experience",
  "skill_gap",
  "seniority",
  "location",
  "english",
  "salary",
  "work_authorization",
  "technical_assessment",
  "culture_or_behavioral",
  "position_closed",
  "no_response",
  "unknown",
  "other",
] as const;
export type RejectionReasonCategory = (typeof REJECTION_REASON_CATEGORIES)[number];

export const REJECTION_REASON_SOURCES = ["explicit", "candidate_inference", "unknown"] as const;
export type RejectionReasonSource = (typeof REJECTION_REASON_SOURCES)[number];

export const CAREER_SOURCES = [
  "linkedin",
  "gupy",
  "jobgether",
  "referral",
  "direct_recruiter",
  "company_careers",
  "community",
  "other",
] as const;
export type CareerSource = (typeof CAREER_SOURCES)[number];

export const CAREER_EVENT_TYPES = [
  "applied",
  "response",
  "screening",
  "technical",
  "final",
  "offer",
  "hired",
  "rejection",
  "withdrawal",
  "status_changed",
  "note",
] as const;
export type CareerEventType = (typeof CAREER_EVENT_TYPES)[number];

export const APPLICATION_LIFECYCLE_SOURCES = ["user", "system", "backfill"] as const;
export type ApplicationLifecycleSource = (typeof APPLICATION_LIFECYCLE_SOURCES)[number];

export const FIT_BANDS = ["0-49", "50-59", "60-69", "70-79", "80-89", "90-100"] as const;
export type FitBand = (typeof FIT_BANDS)[number];

export const PRIORITY_BANDS = ["high", "medium", "low"] as const;
export type PriorityBand = (typeof PRIORITY_BANDS)[number];

export const OBSERVED_ASSOCIATION_DISCLAIMER = "Observed association, not causal attribution.";

export type ApplicationOutcome = {
  applicationId: string;
  finalStatus?: ApplyFlowPipelineStatusV2;
  rejectionStage?: ApplyFlowPipelineStatusV2;
  appliedAt?: string;
  lastActivityAt?: string;
  firstResponseAt?: string;
  screeningAt?: string;
  technicalAt?: string;
  finalInterviewAt?: string;
  offerAt?: string;
  hiredAt?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
  rejectionReason?: string;
  rejectionReasonCategory?: RejectionReasonCategory;
  rejectionReasonSource?: RejectionReasonSource;
  source?: CareerSource;
  resumeVariant?: string;
  resumeStrategy?: string;
  networkingUsed?: boolean;
  contactsCount?: number;
  fitAtApplication?: number;
  decisionAtApplication?: ApplicationDecision;
  priorityAtApplication?: number;
  /** Immutable scores + evidence/case IDs captured when the Application was created. */
  snapshot?: ApplicationDecisionSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationCareerEvent = {
  id: string;
  applicationId: string;
  type: CareerEventType;
  occurredAt: string;
  notes?: string;
  fromStatus?: ApplyFlowPipelineStatusV2;
  toStatus?: ApplyFlowPipelineStatusV2;
  source?: ApplicationLifecycleSource;
};

export type ApplicationEffort = {
  applicationId: string;
  applicationStartedAt?: string;
  applicationSubmittedAt?: string;
  personalizationMinutes?: number;
  networkingMinutes?: number;
  interviewPrepMinutes?: number;
};

export type HistoricalDecisionRecord = {
  jobId?: string;
  applicationId?: string;
  highPriority: boolean;
  qualified: boolean;
  applied: boolean;
  reachedScreening: boolean;
  matches: { requirementKey: string; label: string; category: JobRequirementCategory; status: EvidenceMatchStatus }[];
};

export type EvidenceUsageRecord = {
  applicationId: string;
  evidenceIds: string[];
  labels?: Record<string, string>;
};

export type CaseUsageRecord = {
  applicationId: string;
  cases: string[];
  interviewPrepared?: boolean;
};

export type CareerAnalyticsInput = {
  applications: readonly ApplyFlowApplicationV2Envelope[];
  jobs?: readonly ApplyFlowJob[];
  outcomes?: readonly ApplicationOutcome[];
  events?: readonly ApplicationCareerEvent[];
  efforts?: readonly ApplicationEffort[];
  decisions?: readonly HistoricalDecisionRecord[];
  contacts?: readonly Contact[];
  interactions?: readonly ContactInteraction[];
  evidenceUsage?: readonly EvidenceUsageRecord[];
  caseUsage?: readonly CaseUsageRecord[];
  now?: Date;
};

export type RateBlock = {
  applications: number;
  responses: number;
  screenings: number;
  technicals: number;
  finals: number;
  offers: number;
  responseRate: number;
  screeningRate: number;
  technicalRate: number;
  offerRate: number;
  sampleSize: number;
  confidence: Confidence;
};

export type CareerInsightType =
  | "positive_pattern"
  | "negative_pattern"
  | "gap_pattern"
  | "source_pattern"
  | "resume_pattern"
  | "networking_pattern"
  | "priority_pattern"
  | "insufficient_data";

export type CareerInsight = {
  id: string;
  type: CareerInsightType;
  title: string;
  description: string;
  metrics: Record<string, number | string>;
  confidence: Confidence;
  sampleSize: number;
  recommendedAction?: string;
};

export type CareerFeedbackAction =
  | "response_received"
  | "screening"
  | "technical"
  | "final"
  | "offer"
  | "rejection"
  | "withdrawal";
