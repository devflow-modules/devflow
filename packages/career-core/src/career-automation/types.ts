import type { CareerAgentAllowedCapability } from "../career-agents/capabilities.js";
import type { CareerToolName, CareerToolRiskLevel } from "../career-tools/types.js";
import type { CareerToolInvokeBodyParsed } from "../career-tools/invoke.js";
import type { CareerToolExecutionResult } from "../career-tools/types.js";
import type { CAREER_AUTOMATION_KINDS, CAREER_AUTOMATION_PROVIDERS } from "./constants.js";

export type CareerAutomationProvider = (typeof CAREER_AUTOMATION_PROVIDERS)[number];

export type CareerAutomationKind = (typeof CAREER_AUTOMATION_KINDS)[number];

export type CareerAutomationApprovalScope = "single_execution" | "single_request";

export type CareerAutomationApproval = {
  proposalId: string;
  approved: true;
  approvedAt: string;
  approvalScope: CareerAutomationApprovalScope;
};

/**
 * Server-derived, client-safe, non-executable description of an approved automation.
 * The client never authors requestedTool, requiredCapability, riskLevel, or execution mode.
 */
export type CareerAutomationProposal = {
  proposalId: string;
  kind: CareerAutomationKind;
  title: string;
  description: string;
  requestedTool: CareerToolName;
  requiredCapability: CareerAgentAllowedCapability;
  riskLevel: CareerToolRiskLevel;
  requiresExplicitApproval: boolean;
  inputPreview: Record<string, unknown>;
  reviewRequired: true;
};

export type CareerAutomationContext = {
  careerBundle: import("../schemas/careerBundle.js").CareerBundle;
  selectedSignalIds: string[];
  availableSignals?: import("@devflow/career-sync").ProviderDerivedSignal[];
};

export type CareerAutomationRequest = {
  agentRequestId: string;
  proposalId: string;
  kind: CareerAutomationKind;
  provider: CareerAutomationProvider;
  explicitApproval: true;
  approval: CareerAutomationApproval;
  context: CareerAutomationContext;
};

export type CareerAutomationPolicyBlockCode =
  | "automation_disabled"
  | "unsupported_automation_provider"
  | "unsupported_automation_kind"
  | "automation_not_allowed"
  | "automation_tool_not_allowed"
  | "automation_capability_not_allowed"
  | "explicit_approval_required"
  | "approval_proposal_mismatch"
  | "approval_tool_mismatch"
  | "unsafe_automation_context"
  | "execution_plan_not_available"
  | "automation_execution_failed"
  | "automation_result_invalid";

/**
 * Client-safe error codes returned by an external automation adapter. These never
 * carry raw responses, stack traces, secrets, base URLs, or provider request IDs.
 */
export type CareerAutomationAdapterErrorCode =
  | CareerAutomationPolicyBlockCode
  | "openclaw_disabled"
  | "openclaw_not_configured"
  | "openclaw_auth_failed"
  | "openclaw_timeout"
  | "openclaw_unreachable"
  | "openclaw_request_failed"
  | "openclaw_response_invalid"
  | "openclaw_proposal_mismatch"
  | "openclaw_tool_mismatch"
  | "openclaw_unsafe_response";

export type CareerAutomationPolicyDecision = {
  allowed: boolean;
  code?: CareerAutomationPolicyBlockCode;
  message?: string;
};

export type CareerAutomationExecutionPlan = {
  proposalId: string;
  kind: CareerAutomationKind;
  selectedTool: CareerToolName;
  requiredCapability: CareerAgentAllowedCapability;
  allowed: boolean;
  blockedReasons: string[];
  requiresExplicitApproval: boolean;
  reviewRequired: true;
};

export type CareerAutomationWarning = {
  code: CareerAutomationAdapterErrorCode | "automation_already_running" | "invalid_automation_request";
  message: string;
};

export type CareerAutomationTraceStepCode =
  | "automation_request_received"
  | "proposal_resolved"
  | "execution_plan_resolved"
  | "automation_policy_evaluated"
  | "approval_validated"
  | "tool_permission_validated"
  | "automation_execution_started"
  | "automation_execution_completed"
  | "human_review_required";

export type CareerAutomationTraceStepStatus = "completed" | "blocked" | "skipped" | "simulated";

export type CareerAutomationTraceStep = {
  timestamp: string;
  status: CareerAutomationTraceStepStatus;
  code: CareerAutomationTraceStepCode;
  message: string;
};

export type CareerAutomationTrace = {
  requestId: string;
  proposalId: string;
  steps: CareerAutomationTraceStep[];
};

export type CareerAutomationResultStatus = "completed" | "blocked" | "error";

export type CareerAutomationObservability = {
  provider: CareerAutomationProvider;
  durationMs: number;
  automationKind: CareerAutomationKind | "unsupported_automation_kind";
  toolName: CareerToolName | "unknown";
  validationStatus: "valid" | "invalid" | "skipped";
  externalProviderCalled: boolean;
  retryCount: number;
};

export type CareerAutomationExecutionResult = {
  status: CareerAutomationResultStatus;
  provider: CareerAutomationProvider;
  proposalId: string;
  kind: CareerAutomationKind | "unsupported_automation_kind";
  toolName: CareerToolName | "unknown";
  data: Record<string, unknown>;
  warnings: CareerAutomationWarning[];
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: false;
  executedExternally: boolean;
  backgroundExecution: false;
  scheduled: false;
  trace: CareerAutomationTrace;
  observability?: CareerAutomationObservability;
};

export type CareerAutomationProviderConfig = {
  provider: CareerAutomationProvider;
  timeoutMs: number;
  configured: boolean;
};

/**
 * Minimal, server-built payload handed to an automation adapter. The adapter never
 * receives the full tool registry, full capabilities, raw CareerBundle, raw provider
 * metadata, or a persisted approval. It only executes the single permitted tool.
 */
export type CareerAutomationAdapterRequest = {
  proposal: CareerAutomationProposal;
  executionPlan: CareerAutomationExecutionPlan;
  toolInvocation: CareerToolInvokeBodyParsed;
  timeoutMs: number;
  requestedAt: string;
};

export type CareerAutomationAdapterResponse = {
  ok: boolean;
  externalCall: boolean;
  data: Record<string, unknown>;
  toolResult?: CareerToolExecutionResult;
  durationMs?: number;
  retryCount?: number;
  error?: { code: CareerAutomationAdapterErrorCode; message: string };
};

export type CareerAutomationAdapter = {
  provider: CareerAutomationProvider;
  execute(input: CareerAutomationAdapterRequest): Promise<CareerAutomationAdapterResponse>;
};
