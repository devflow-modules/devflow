import type { CareerAgentIntent, CareerAgentResult } from "../career-agents/types.js";
import type { CareerToolName, CareerToolRiskLevel } from "../career-tools/types.js";
import type { CAREER_CHAT_PROVIDERS } from "./constants.js";

export type CareerChatProvider = (typeof CAREER_CHAT_PROVIDERS)[number];

export type CareerChatRole = "user";

export type CareerChatMessage = {
  role: CareerChatRole;
  content: string;
};

export type CareerChatConversation = {
  conversationId: string;
  provider: CareerChatProvider;
};

export type CareerChatIntent = CareerAgentIntent;

export type CareerChatRequest = {
  provider: CareerChatProvider;
  conversationId: string;
  message: CareerChatMessage;
  explicitConsent: true;
  action?: CareerChatIntent;
  context: {
    careerBundle: import("../schemas/careerBundle.js").CareerBundle;
    selectedSignalIds: string[];
    availableSignals?: import("@devflow/career-sync").ProviderDerivedSignal[];
    analysisInput?: import("../career-agents/types.js").CareerAnalysisInput;
  };
};

export type CareerChatNormalizedInput = {
  provider: CareerChatProvider;
  conversationId: string;
  action: CareerChatIntent;
  message: CareerChatMessage;
  explicitConsent: true;
  context: CareerChatRequest["context"];
};

export type CareerChatToolProposalStatus =
  | "proposed"
  | "approval_required"
  | "ready_for_review"
  | "blocked";

export type CareerChatToolProposal = {
  toolName: CareerToolName;
  description: string;
  requiredCapability: string;
  riskLevel: CareerToolRiskLevel;
  requiresExplicitApproval: boolean;
  inputPreview: Record<string, unknown>;
  status: CareerChatToolProposalStatus;
};

export type CareerChatApprovalRequest = {
  toolName: CareerToolName;
  approvalScope: "single_execution" | "single_request";
  invokePath: "/career-tools/invoke";
};

export type CareerChatWarningCode =
  | "librechat_adapter_disabled"
  | "unsupported_chat_intent"
  | "invalid_chat_request"
  | "unsafe_chat_context"
  | "empty_chat_message"
  | "message_too_long"
  | "explicit_consent_required"
  | "orchestration_blocked";

export type CareerChatWarning = {
  code: CareerChatWarningCode | string;
  message: string;
};

export type CareerChatTraceStepCode =
  | "chat_request_received"
  | "chat_request_normalized"
  | "intent_resolved"
  | "orchestration_started"
  | "orchestration_completed"
  | "tool_proposals_resolved"
  | "human_review_required";

export type CareerChatTraceStep = {
  timestamp: string;
  status: "completed" | "blocked" | "skipped";
  code: CareerChatTraceStepCode;
  message: string;
};

export type CareerChatTrace = {
  conversationId: string;
  steps: CareerChatTraceStep[];
};

export type CareerChatResponseStatus = "completed" | "blocked" | "error";

export type CareerChatResponse = {
  status: CareerChatResponseStatus;
  provider: CareerChatProvider;
  conversationId: string;
  intent: CareerChatIntent | "unknown";
  agentResult: CareerAgentResult | null;
  toolProposals: CareerChatToolProposal[];
  warnings: CareerChatWarning[];
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: false;
  executedExternally: false;
  trace: CareerChatTrace;
};
