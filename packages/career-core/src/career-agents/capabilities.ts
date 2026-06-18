export const CAREER_AGENT_ALLOWED_CAPABILITIES = [
  "read_career_bundle",
  "read_selected_signals",
  "derive_fit_summary",
  "derive_gap_analysis",
  "derive_interview_plan",
  "derive_resume_analysis",
  "derive_ats_analysis",
  "derive_career_strategy",
  "create_review_proposal",
] as const;

export const CAREER_AGENT_FORBIDDEN_CAPABILITIES = [
  "submit_application",
  "send_email",
  "send_whatsapp",
  "modify_application",
  "modify_resume",
  "persist_provider_data",
  "access_provider_token",
  "execute_external_tool",
] as const;

export type CareerAgentAllowedCapability = (typeof CAREER_AGENT_ALLOWED_CAPABILITIES)[number];
export type CareerAgentForbiddenCapability = (typeof CAREER_AGENT_FORBIDDEN_CAPABILITIES)[number];
export type CareerAgentCapability = CareerAgentAllowedCapability | CareerAgentForbiddenCapability;

export const CAREER_AGENT_CAPABILITIES_BY_AGENT = {
  career_orchestrator: ["read_career_bundle", "read_selected_signals", "create_review_proposal"] as const,
  application_analyst: [
    "read_career_bundle",
    "read_selected_signals",
    "derive_fit_summary",
    "create_review_proposal",
  ] as const,
  profile_gap_analyst: [
    "read_career_bundle",
    "read_selected_signals",
    "derive_gap_analysis",
    "create_review_proposal",
  ] as const,
  interview_coach: [
    "read_career_bundle",
    "read_selected_signals",
    "derive_interview_plan",
    "create_review_proposal",
  ] as const,
  resume_analyst: [
    "read_career_bundle",
    "derive_resume_analysis",
    "create_review_proposal",
  ] as const,
  ats_analyst: [
    "read_career_bundle",
    "derive_ats_analysis",
    "create_review_proposal",
  ] as const,
  career_strategy_advisor: [
    "read_career_bundle",
    "read_selected_signals",
    "derive_career_strategy",
    "create_review_proposal",
  ] as const,
} satisfies Record<string, readonly CareerAgentAllowedCapability[]>;
