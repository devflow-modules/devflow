export const CAREER_AGENT_WORKSPACE_TITLE = "Career Agent Workspace";
export const CAREER_AGENT_WORKSPACE_BADGE_MANUAL = "Manual review";
export const CAREER_AGENT_WORKSPACE_BADGE_READ_ONLY = "Read-only";
export const CAREER_AGENT_WORKSPACE_BADGE_IN_MEMORY = "In-memory only";

export const CAREER_AGENT_WORKSPACE_DESCRIPTION =
  "Deterministic, policy-gated agent proposals for structured career review.";

export const CAREER_AGENT_WORKSPACE_DISCLAIMER =
  "Agent outputs are structured proposals for human review. No application, message, profile, or provider data is changed automatically.";

export const CAREER_AGENT_WORKSPACE_RUN_LABEL = "Run analysis";
export const CAREER_AGENT_WORKSPACE_INTENT_LABEL = "Intent";
export const CAREER_AGENT_WORKSPACE_AGENT_LABEL = "Recommended agent";
export const CAREER_AGENT_WORKSPACE_CONSENT_LABEL =
  "I understand these outputs are proposals for manual review only.";

export const CAREER_AGENT_WORKSPACE_IDLE_MESSAGE =
  "Select an intent, confirm consent, and run a structured analysis.";
export const CAREER_AGENT_WORKSPACE_BLOCKED_MESSAGE =
  "Analysis is blocked until consent and required inputs are available.";
export const CAREER_AGENT_WORKSPACE_NO_BUNDLE_MESSAGE =
  "Load dashboard applications to provide a sanitized CareerBundle context.";

export const CAREER_AGENT_WORKSPACE_INTENT_LABELS = {
  analyze_application_fit: "Analyze application fit",
  analyze_profile_gaps: "Analyze profile gaps",
  prepare_interview: "Prepare interview",
} as const;
