import type { CareerBundle } from "../schemas/careerBundle.js";
import type { CareerAgentIntent, CareerAgentKind, CareerAgentResult } from "../career-agents/types.js";
import type { CAREER_LLM_PROVIDERS, CAREER_LLM_TASKS } from "./constants.js";

export type CareerLlmProvider = (typeof CAREER_LLM_PROVIDERS)[number];

export type CareerLlmTask = (typeof CAREER_LLM_TASKS)[number];

export type CareerLlmItemPriority = "high" | "medium" | "low";

export type CareerLlmStructuredItem = {
  category: string;
  text: string;
  priority: CareerLlmItemPriority;
  evidenceIds: string[];
};

export type CareerLlmStructuredOutput = {
  title: string;
  summary: string;
  findings: CareerLlmStructuredItem[];
  recommendations: CareerLlmStructuredItem[];
  evidenceReferences: string[];
  warnings: string[];
};

export type CareerLlmContext = {
  careerBundle: CareerBundle;
  agentResult: CareerAgentResult;
  selectedSignalIds: string[];
  selectedSignalSummaries: string[];
  userMessage: string;
};

export type CareerLlmRequest = {
  requestId: string;
  provider: CareerLlmProvider;
  task: CareerLlmTask;
  agent: CareerAgentKind;
  intent: CareerAgentIntent;
  explicitConsent: true;
  context: CareerLlmContext;
};

export type CareerLlmPromptEnvelope = {
  task: CareerLlmTask;
  instructions: string;
  contextSummary: string;
  outputSchema: string;
  constraints: string[];
};

export type CareerLlmPolicyBlockCode =
  | "llm_disabled"
  | "explicit_consent_required"
  | "unsupported_llm_provider"
  | "unsupported_llm_task"
  | "agent_task_mismatch"
  | "unsafe_llm_context"
  | "invalid_llm_input"
  | "prompt_injection_pattern_detected"
  | "provider_not_configured"
  | "provider_request_failed"
  | "invalid_structured_output"
  | "output_limit_exceeded";

export type CareerLlmWarningCode = CareerLlmPolicyBlockCode | "unsupported_llm_task";

export type CareerLlmWarning = {
  code: CareerLlmWarningCode | string;
  message: string;
};

export type CareerLlmPolicyDecision = {
  allowed: boolean;
  code?: CareerLlmPolicyBlockCode;
  message?: string;
};

export type CareerLlmProviderConfig = {
  provider: CareerLlmProvider;
  modelAlias: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  configured: boolean;
};

export type CareerLlmTraceStepCode =
  | "llm_request_received"
  | "chat_request_normalized"
  | "agent_orchestration_completed"
  | "llm_task_resolved"
  | "llm_policy_evaluated"
  | "prompt_envelope_created"
  | "provider_called"
  | "structured_output_validated"
  | "human_review_required";

export type CareerLlmTraceStepStatus = "completed" | "blocked" | "skipped" | "simulated";

export type CareerLlmTraceStep = {
  timestamp: string;
  status: CareerLlmTraceStepStatus;
  code: CareerLlmTraceStepCode;
  message: string;
};

export type CareerLlmTrace = {
  requestId: string;
  steps: CareerLlmTraceStep[];
};

export type CareerLlmUsage = {
  inputUnits: number;
  outputUnits: number;
};

export type CareerLlmObservability = {
  provider: CareerLlmProvider;
  modelAlias: string;
  durationMs: number;
  outputItemCount: number;
  validationStatus: "valid" | "invalid" | "skipped";
  usage?: CareerLlmUsage;
};

export type CareerLlmResultStatus = "completed" | "blocked" | "error";

export type CareerLlmResult = {
  status: CareerLlmResultStatus;
  provider: CareerLlmProvider;
  task: CareerLlmTask | "unsupported_llm_task";
  agent: CareerAgentKind | "career_orchestrator";
  output: CareerLlmStructuredOutput | null;
  warnings: CareerLlmWarning[];
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: false;
  executedExternally: boolean;
  externalProviderCalled: boolean;
  toolExecutionOccurred: false;
  trace: CareerLlmTrace;
  observability?: CareerLlmObservability;
};

export type CareerLlmProviderRequest = {
  task: CareerLlmTask;
  envelope: CareerLlmPromptEnvelope;
  modelAlias: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type CareerLlmProviderResponse = {
  ok: boolean;
  externalCall: boolean;
  output?: unknown;
  modelAlias?: string;
  usage?: CareerLlmUsage;
  durationMs?: number;
  error?: { code: CareerLlmPolicyBlockCode; message: string };
};

export interface CareerLlmProviderAdapter {
  readonly provider: CareerLlmProvider;
  generate(request: CareerLlmProviderRequest): Promise<CareerLlmProviderResponse>;
}
