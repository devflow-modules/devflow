import type { ProviderDerivedSignal } from "@devflow/career-sync";
import type { CareerBundle } from "../schemas/careerBundle.js";
import type { CareerAgentAllowedCapability } from "./capabilities.js";

export const CAREER_AGENT_KINDS = [
  "career_orchestrator",
  "application_analyst",
  "profile_gap_analyst",
  "interview_coach",
] as const;

export type CareerAgentKind = (typeof CAREER_AGENT_KINDS)[number];

export const CAREER_AGENT_INTENTS = [
  "analyze_application_fit",
  "analyze_profile_gaps",
  "prepare_interview",
] as const;

export type CareerAgentIntent = (typeof CAREER_AGENT_INTENTS)[number];

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

export type CareerAgentRequest = {
  requestId: string;
  intent: CareerAgentIntent;
  explicitConsent: true;
  requestedAgent?: CareerAgentKind;
  context: {
    careerBundle: CareerBundle;
    selectedSignalIds: string[];
    availableSignals?: ProviderDerivedSignal[];
  };
};

export type CareerAgentContext = {
  requestId: string;
  intent: CareerAgentIntent;
  explicitConsent: true;
  careerBundle: CareerBundle;
  selectedSignalIds: string[];
  selectedSignals: ProviderDerivedSignal[];
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
};
