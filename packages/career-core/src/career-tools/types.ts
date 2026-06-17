import type { CareerAgentAllowedCapability } from "../career-agents/capabilities.js";

export const CAREER_TOOL_NAMES = [
  "career.read_bundle",
  "career.read_selected_signals",
  "career.derive_fit_summary",
  "career.derive_gap_analysis",
  "career.derive_interview_plan",
  "career.create_review_proposal",
  "career.export_review_payload",
] as const;

export type CareerToolName = (typeof CAREER_TOOL_NAMES)[number];

export const CAREER_TOOL_FORBIDDEN_NAMES = [
  "career.submit_application",
  "career.send_email",
  "career.send_whatsapp",
  "career.modify_application",
  "career.modify_resume",
  "career.persist_provider_data",
  "career.access_provider_token",
  "system.execute_shell",
  "system.read_filesystem",
  "system.write_filesystem",
  "system.fetch_url",
] as const;

export type CareerToolForbiddenName = (typeof CAREER_TOOL_FORBIDDEN_NAMES)[number];

export type CareerToolRiskLevel = "read" | "derive" | "export" | "blocked";

export type CareerToolExecutionMode = "local_pure" | "simulated" | "blocked";

export type CareerToolPermissionBlockCode =
  | "unsupported_tool"
  | "tool_not_allowed"
  | "capability_not_allowed"
  | "explicit_approval_required"
  | "invalid_tool_input"
  | "unsafe_tool_context"
  | "blocked_tool"
  | "agent_tool_mismatch"
  | "execution_not_supported"
  | "execution_plan_not_available";

export type CareerToolApprovalScope = "single_execution" | "single_request";

export type CareerToolApproval = {
  toolName: CareerToolName;
  approved: true;
  approvedAt: string;
  approvalScope: CareerToolApprovalScope;
};

export type CareerToolDefinition = {
  name: CareerToolName;
  description: string;
  requiredCapability: CareerAgentAllowedCapability;
  riskLevel: CareerToolRiskLevel;
  requiresExplicitApproval: boolean;
  executionMode: CareerToolExecutionMode;
};

export type CareerToolPermission = {
  allowed: boolean;
  code?: CareerToolPermissionBlockCode;
  message?: string;
};

export type CareerToolTraceStepCode =
  | "tool_resolved"
  | "schema_validated"
  | "capability_checked"
  | "approval_checked"
  | "execution_started"
  | "execution_completed"
  | "review_required";

export type CareerToolTraceStep = {
  timestamp: string;
  status: "completed" | "blocked" | "skipped";
  code: CareerToolTraceStepCode;
  message: string;
};

export type CareerToolTrace = {
  requestId: string;
  toolName: CareerToolName | "unknown";
  steps: CareerToolTraceStep[];
};

export type CareerToolExecutionRequest = {
  requestId: string;
  agentRequestId: string;
  agent: import("../career-agents/types.js").CareerAgentKind;
  toolName: CareerToolName;
  input: unknown;
  approval?: CareerToolApproval;
  executionPlan: import("../career-agents/types.js").CareerAgentExecutionPlan;
  context: import("../career-agents/types.js").CareerAgentContext;
};

export type CareerToolExecutionPlan = {
  toolName: CareerToolName;
  requiredCapability: CareerAgentAllowedCapability;
  riskLevel: CareerToolRiskLevel;
  requiresExplicitApproval: boolean;
  executionMode: CareerToolExecutionMode;
  allowed: boolean;
};

export type CareerToolExecutionResultStatus = "completed" | "blocked" | "error";

export type CareerToolExecutionResult = {
  status: CareerToolExecutionResultStatus;
  toolName: CareerToolName | "unknown";
  data: Record<string, unknown>;
  warnings: Array<{ code: string; message: string }>;
  reviewRequired: true;
  safeForClient: true;
  hasToken: false;
  persisted: false;
  executedExternally: false;
  trace: CareerToolTrace;
};

export type CareerMcpToolDescriptor = {
  name: CareerToolName;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type CareerToolRegistry = Readonly<Record<CareerToolName, CareerToolDefinition>>;
