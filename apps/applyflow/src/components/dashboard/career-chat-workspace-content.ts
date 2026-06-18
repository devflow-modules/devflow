import type { CareerChatIntent } from "@devflow/career-core";

export const CAREER_CHAT_WORKSPACE_TITLE = "Career Chat Workspace";
export const CAREER_CHAT_WORKSPACE_BADGE_MANUAL = "Manual review";
export const CAREER_CHAT_WORKSPACE_BADGE_READ_ONLY = "Read-only";
export const CAREER_CHAT_WORKSPACE_BADGE_IN_MEMORY = "In-memory only";

export const CAREER_CHAT_WORKSPACE_DESCRIPTION =
  "Structured chat messages are converted into deterministic career agent requests.";

export const CAREER_CHAT_WORKSPACE_DISCLAIMER =
  "Chat messages are converted into structured agent requests. No tool runs and no application, message, profile, provider, or external system is changed without policy validation and human approval.";

export const CAREER_CHAT_WORKSPACE_ACTION_LABEL = "Action";
export const CAREER_CHAT_WORKSPACE_MESSAGE_LABEL = "Message";
export const CAREER_CHAT_WORKSPACE_CONSENT_LABEL =
  "I understand chat input becomes structured proposals for manual review only.";
export const CAREER_CHAT_WORKSPACE_SEND_LABEL = "Send to Career Agent";

export const CAREER_CHAT_WORKSPACE_IDLE_MESSAGE =
  "Select an action, write a message, confirm consent, and send a structured request.";
export const CAREER_CHAT_WORKSPACE_BLOCKED_MESSAGE =
  "Chat is blocked until consent, required inputs, and the adapter feature flag are available.";
export const CAREER_CHAT_WORKSPACE_NO_BUNDLE_MESSAGE =
  "Load dashboard applications to provide a sanitized CareerBundle context.";
export const CAREER_CHAT_WORKSPACE_VALIDATING_MESSAGE = "Validating chat request…";
export const CAREER_CHAT_WORKSPACE_ADAPTER_DISABLED_MESSAGE =
  "LibreChat adapter is disabled. Enable LIBRECHAT_ADAPTER_ENABLED locally to test.";

export const CAREER_CHAT_WORKSPACE_REVIEW_PROPOSAL_LABEL = "Review proposal";
export const CAREER_CHAT_WORKSPACE_APPROVE_ONCE_LABEL = "Approve once";
export const CAREER_CHAT_WORKSPACE_CANCEL_LABEL = "Cancel";
export const CAREER_CHAT_WORKSPACE_COPY_RESPONSE_LABEL = "Copy structured response";

export const CAREER_CHAT_WORKSPACE_ACTION_LABELS: Record<CareerChatIntent, string> = {
  analyze_application_fit: "Analyze application fit",
  analyze_profile_gaps: "Analyze profile gaps",
  prepare_interview: "Prepare interview",
  analyze_resume: "Analisar currículo",
  analyze_ats_compatibility: "Verificar compatibilidade ATS",
  plan_career_strategy: "Planejar estratégia de carreira",
};

export const CAREER_CHAT_WORKSPACE_SPECIALIST_LABEL = "Specialist inputs (review only)";
export const CAREER_CHAT_WORKSPACE_RESUME_BULLETS_LABEL = "Resume bullets (one per line)";
export const CAREER_CHAT_WORKSPACE_RESUME_SKILLS_LABEL = "Resume skills (comma-separated)";
export const CAREER_CHAT_WORKSPACE_JOB_REQUIREMENTS_LABEL = "Job requirements (one per line)";
export const CAREER_CHAT_WORKSPACE_TARGET_ROLES_LABEL = "Target roles (comma-separated)";
export const CAREER_CHAT_WORKSPACE_AVAILABILITY_LABEL = "Availability (e.g. 10h/week)";
