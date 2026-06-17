import type { CareerAgentAllowedCapability } from "../career-agents/capabilities.js";
import type { CareerToolDefinition, CareerToolName, CareerToolRegistry } from "./types.js";
import { CAREER_TOOL_NAMES } from "./types.js";

export { CAREER_TOOL_NAMES };

const READ_BUNDLE: CareerToolDefinition = {
  name: "career.read_bundle",
  description: "Read sanitized CareerBundle metadata from in-memory context.",
  requiredCapability: "read_career_bundle",
  riskLevel: "read",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const READ_SIGNALS: CareerToolDefinition = {
  name: "career.read_selected_signals",
  description: "Read user-selected provider-derived signals from in-memory context.",
  requiredCapability: "read_selected_signals",
  riskLevel: "read",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const DERIVE_FIT: CareerToolDefinition = {
  name: "career.derive_fit_summary",
  description: "Derive structured application fit summary from sanitized context.",
  requiredCapability: "derive_fit_summary",
  riskLevel: "derive",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const DERIVE_GAP: CareerToolDefinition = {
  name: "career.derive_gap_analysis",
  description: "Derive structured profile gap analysis from sanitized context.",
  requiredCapability: "derive_gap_analysis",
  riskLevel: "derive",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const DERIVE_INTERVIEW: CareerToolDefinition = {
  name: "career.derive_interview_plan",
  description: "Derive structured interview preparation plan from sanitized context.",
  requiredCapability: "derive_interview_plan",
  riskLevel: "derive",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const CREATE_PROPOSAL: CareerToolDefinition = {
  name: "career.create_review_proposal",
  description: "Create a structured review proposal artifact for human approval.",
  requiredCapability: "create_review_proposal",
  riskLevel: "export",
  requiresExplicitApproval: false,
  executionMode: "local_pure",
};

const EXPORT_PAYLOAD: CareerToolDefinition = {
  name: "career.export_review_payload",
  description: "Preview exportable review payload without writing files or calling external systems.",
  requiredCapability: "create_review_proposal",
  riskLevel: "export",
  requiresExplicitApproval: true,
  executionMode: "local_pure",
};

export const CAREER_TOOL_CAPABILITY_MAP: Record<CareerToolName, CareerAgentAllowedCapability> = {
  "career.read_bundle": "read_career_bundle",
  "career.read_selected_signals": "read_selected_signals",
  "career.derive_fit_summary": "derive_fit_summary",
  "career.derive_gap_analysis": "derive_gap_analysis",
  "career.derive_interview_plan": "derive_interview_plan",
  "career.create_review_proposal": "create_review_proposal",
  "career.export_review_payload": "create_review_proposal",
};

export const CAREER_TOOL_REGISTRY: CareerToolRegistry = Object.freeze({
  "career.read_bundle": Object.freeze(READ_BUNDLE),
  "career.read_selected_signals": Object.freeze(READ_SIGNALS),
  "career.derive_fit_summary": Object.freeze(DERIVE_FIT),
  "career.derive_gap_analysis": Object.freeze(DERIVE_GAP),
  "career.derive_interview_plan": Object.freeze(DERIVE_INTERVIEW),
  "career.create_review_proposal": Object.freeze(CREATE_PROPOSAL),
  "career.export_review_payload": Object.freeze(EXPORT_PAYLOAD),
});

export function resolveCareerToolDefinition(toolName: string): CareerToolDefinition | null {
  return (CAREER_TOOL_REGISTRY as Record<string, CareerToolDefinition>)[toolName] ?? null;
}

export function isCareerToolName(value: string): value is CareerToolName {
  return value in CAREER_TOOL_REGISTRY;
}
