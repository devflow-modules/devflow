import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "../schemas/careerBundle.js";
import type { CareerAgentAllowedCapability } from "./capabilities.js";

export const CAREER_AGENT_KINDS = [
  "career_orchestrator",
  "application_analyst",
  "profile_gap_analyst",
  "interview_coach",
  "resume_analyst",
  "ats_analyst",
  "career_strategy_advisor",
] as const;

export type CareerAgentKind = (typeof CAREER_AGENT_KINDS)[number];

export const CAREER_AGENT_INTENTS = [
  "analyze_application_fit",
  "analyze_profile_gaps",
  "prepare_interview",
  "analyze_resume",
  "analyze_ats_compatibility",
  "plan_career_strategy",
] as const;

export type CareerAgentIntent = (typeof CAREER_AGENT_INTENTS)[number];

/**
 * Server-derived, non-executable proposal tool identifiers. These are intentionally
 * NOT part of the executable career tool registry: they describe a review proposal
 * that a human must approve. They can never be invoked via /career-tools/invoke.
 */
export const CAREER_AGENT_PROPOSAL_TOOLS = [
  "career.prepare_resume_review",
  "career.prepare_ats_review",
  "career.prepare_strategy_review",
] as const;

export type CareerAgentProposalToolName = (typeof CAREER_AGENT_PROPOSAL_TOOLS)[number];

export type CareerAgentPolicyBlockCode =
  | "explicit_consent_required"
  | "unsafe_context"
  | "raw_provider_data_not_allowed"
  | "provider_token_not_allowed"
  | "unsupported_agent"
  | "unsupported_intent"
  | "capability_not_allowed"
  | "missing_required_input";

export type CareerAgentPolicy = {
  explicitConsentRequired: true;
  requireSanitizedBundle: true;
  forbidRawProviderData: true;
  forbidProviderTokens: true;
  requireKnownSelectedSignals: true;
  allowlistCapabilitiesOnly: true;
};

/**
 * Optional, sanitized, client-safe specialist inputs. The client never authors an
 * agent/task/tool/capability here. Free of raw files, URLs, scripts, or secrets.
 */
export type CareerResumeSnapshot = {
  summary?: string;
  skills: string[];
  experiences: Array<{ title: string; company: string; bullets: string[] }>;
  projects?: Array<{ name: string; bullets: string[] }>;
  education?: string[];
};

export type CareerJobSnapshot = {
  title: string;
  requiredRequirements: string[];
  preferredRequirements?: string[];
  keywords?: string[];
  roleSummary?: string;
};

export type CareerAnalysisInput = {
  resumeSnapshot?: CareerResumeSnapshot;
  jobSnapshot?: CareerJobSnapshot;
  targetRole?: string;
  targetSeniority?: string;
  targetStack?: string[];
  targetRoles?: string[];
  availability?: string;
  constraints?: string[];
};

export type CareerAgentRequest = {
  requestId: string;
  intent: CareerAgentIntent;
  explicitConsent: true;
  requestedAgent?: CareerAgentKind;
  context: {
    careerBundle: CareerBundle;
    selectedSignalIds: string[];
    availableSignals?: ProviderDerivedSignal[];
    analysisInput?: CareerAnalysisInput;
  };
};

export type CareerAgentContext = {
  requestId: string;
  intent: CareerAgentIntent;
  explicitConsent: true;
  careerBundle: CareerBundle;
  selectedSignalIds: string[];
  selectedSignals: ProviderDerivedSignal[];
  analysisInput: CareerAnalysisInput;
  sanitized: true;
  rawProviderData: false;
  hasToken: false;
};

export type CareerAgentExecutionPlan = {
  selectedAgent: CareerAgentKind;
  reason: string;
  requiredInputs: string[];
  missingInputs: string[];
  allowedCapabilities: CareerAgentAllowedCapability[];
  blockedCapabilities: string[];
  reviewRequired: true;
};

export type CareerAgentStructuredItem = {
  title: string;
  category: string;
  evidence: string[];
  recommendation: string;
  priority: "high" | "medium" | "low";
};

export type CareerAgentFinding = CareerAgentStructuredItem & {
  kind: "fit" | "gap" | "evidence" | "question" | "study" | "interview";
};

export type CareerAgentRecommendation = CareerAgentStructuredItem;

export type CareerAgentWarningCode =
  | "agent_intent_mismatch"
  | "no_provider_signals_selected"
  | "missing_required_input"
  | CareerAgentPolicyBlockCode;

export type CareerAgentWarning = {
  code: CareerAgentWarningCode;
  message: string;
};

export type CareerAgentTraceStepCode =
  | "request_validated"
  | "policy_evaluated"
  | "agent_selected"
  | "capabilities_resolved"
  | "execution_completed"
  | "review_required";

export type CareerAgentTraceStepStatus = "completed" | "blocked" | "skipped";

export type CareerAgentTraceStep = {
  timestamp: string;
  status: CareerAgentTraceStepStatus;
  code: CareerAgentTraceStepCode;
  message: string;
};

export type CareerAgentTrace = {
  requestId: string;
  steps: CareerAgentTraceStep[];
};

export type CareerAgentResultStatus = "completed" | "blocked" | "error";

/**
 * Server-derived, non-executable review proposal. References a proposal tool name
 * (not in the executable registry) plus the manual export tool. Never invoked.
 */
export type CareerAgentReviewProposal = {
  proposalTool: CareerAgentProposalToolName;
  exportTool: "career.export_review_payload";
  title: string;
  summary: string;
  sanitizedArguments: Record<string, unknown>;
  reviewRequired: true;
  executed: false;
};

export type ResumeBulletRecommendation = {
  section: string;
  originalSummary: string;
  recommendation: string;
  reason: string;
};

export type ResumeAnalysis = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingEvidence: string[];
  bulletRecommendations: ResumeBulletRecommendation[];
  sectionRecommendations: string[];
  risks: string[];
  nextActions: string[];
  reviewRequired: true;
};

export type AtsRequirementCoverage = {
  requirement: string;
  status: "covered" | "partial" | "missing";
  evidence: string[];
};

export type AtsAnalysis = {
  compatibilityScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  requiredRequirementCoverage: AtsRequirementCoverage[];
  parsingRisks: string[];
  structureRisks: string[];
  keywordStuffingWarnings: string[];
  recommendations: string[];
  reviewRequired: true;
};

export type CareerStrategyPriorityRole = {
  role: string;
  rationale: string;
  readiness: "ready" | "near_ready" | "longer_term";
};

export type CareerStrategySkillPriority = {
  skill: string;
  priority: "high" | "medium" | "low";
  reason: string;
  evidence: string[];
};

export type CareerStrategyPlan = {
  positioningSummary: string;
  priorityRoles: CareerStrategyPriorityRole[];
  skillPriorities: CareerStrategySkillPriority[];
  portfolioPriorities: string[];
  applicationStrategy: string[];
  thirtyDayPlan: string[];
  sixtyDayPlan: string[];
  ninetyDayPlan: string[];
  risks: string[];
  reviewRequired: true;
};

export type InterviewPreparationProposal = {
  reviewRequired: true;
  inMemory: true;
  exportable: true;
  copyable: true;
  focusAreas: string[];
  studyTopics: CareerAgentStructuredItem[];
  starPrompts: CareerAgentStructuredItem[];
  mockInterviewPlan: CareerAgentStructuredItem[];
};

export type CareerAgentResult = {
  status: CareerAgentResultStatus;
  agent: CareerAgentKind;
  summary: string;
  findings: CareerAgentFinding[];
  recommendations: CareerAgentRecommendation[];
  evidence: string[];
  warnings: CareerAgentWarning[];
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  rawProviderDataUsed: false;
  persisted: false;
  trace: CareerAgentTrace;
  executionPlan?: CareerAgentExecutionPlan;
  interviewPreparationProposal?: InterviewPreparationProposal;
  resumeAnalysis?: ResumeAnalysis;
  atsAnalysis?: AtsAnalysis;
  careerStrategyPlan?: CareerStrategyPlan;
  reviewProposal?: CareerAgentReviewProposal;
};
