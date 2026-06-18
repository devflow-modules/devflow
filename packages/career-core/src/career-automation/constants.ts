import type { CareerAgentAllowedCapability } from "../career-agents/capabilities.js";
import type { CareerAgentIntent } from "../career-agents/types.js";
import type { CareerToolName } from "../career-tools/types.js";

export const CAREER_AUTOMATION_PROVIDERS = ["openclaw", "mock"] as const;

export const CAREER_AUTOMATION_DEFAULT_PROVIDER = "mock" as const;

/**
 * Allowlisted, non-destructive automation kinds. Each kind maps deterministically
 * to a single registered career tool. The client never selects the tool, capability,
 * risk level, or execution mode — the server derives them from the kind only.
 */
export const CAREER_AUTOMATION_KINDS = [
  "prepare_application_review",
  "prepare_profile_gap_review",
  "prepare_interview_plan",
  "prepare_review_export",
] as const;

/**
 * Explicitly forbidden automation kinds. Listed for documentation and defense in
 * depth; they are never registered and resolve to unsupported_automation_kind.
 */
export const CAREER_AUTOMATION_FORBIDDEN_KINDS = [
  "submit_application",
  "send_email",
  "send_whatsapp",
  "modify_application",
  "modify_resume",
  "persist_provider_data",
  "execute_shell",
  "write_filesystem",
  "fetch_url",
] as const;

export type CareerAutomationKindMapping = {
  intent: CareerAgentIntent;
  tool: CareerToolName;
  requiredCapability: CareerAgentAllowedCapability;
  requiresExplicitApproval: boolean;
  title: string;
  description: string;
};

/**
 * Fixed, server-authoritative mapping from automation kind to a single tool.
 * This is the only place that decides which tool an automation may invoke.
 */
export const CAREER_AUTOMATION_KIND_MAP: Record<
  (typeof CAREER_AUTOMATION_KINDS)[number],
  CareerAutomationKindMapping
> = {
  prepare_application_review: {
    intent: "analyze_application_fit",
    tool: "career.derive_fit_summary",
    requiredCapability: "derive_fit_summary",
    requiresExplicitApproval: false,
    title: "Prepare application fit review",
    description: "Derive a structured application fit summary for human review. No application is changed.",
  },
  prepare_profile_gap_review: {
    intent: "analyze_profile_gaps",
    tool: "career.derive_gap_analysis",
    requiredCapability: "derive_gap_analysis",
    requiresExplicitApproval: false,
    title: "Prepare profile gap review",
    description: "Derive a structured profile gap analysis for human review. No profile is changed.",
  },
  prepare_interview_plan: {
    intent: "prepare_interview",
    tool: "career.derive_interview_plan",
    requiredCapability: "derive_interview_plan",
    requiresExplicitApproval: false,
    title: "Prepare interview plan",
    description: "Derive a structured interview preparation plan for human review. Nothing is scheduled or sent.",
  },
  prepare_review_export: {
    intent: "analyze_application_fit",
    tool: "career.export_review_payload",
    requiredCapability: "create_review_proposal",
    requiresExplicitApproval: true,
    title: "Prepare review export",
    description:
      "Preview an exportable review payload for human approval. No file is written and no external system is called.",
  },
};

/**
 * Tool risk levels accepted by the automation boundary. Anything outside this set
 * (e.g. blocked) is rejected as a destructive or unsupported automation.
 */
export const CAREER_AUTOMATION_ALLOWED_RISK_LEVELS = ["read", "derive", "export"] as const;
