import type { CareerChatIntent } from "@devflow/career-core";

export const CAREER_AI_DRAFT_TITLE = "Career AI Draft";
export const CAREER_AI_DRAFT_BADGE_MANUAL = "Manual review";
export const CAREER_AI_DRAFT_BADGE_READ_ONLY = "Read-only";
export const CAREER_AI_DRAFT_BADGE_IN_MEMORY = "In-memory only";

export const CAREER_AI_DRAFT_DESCRIPTION =
  "A controlled LLM produces a structured, reviewable draft from the deterministic agent analysis.";

export const CAREER_AI_DRAFT_DISCLAIMER =
  "AI-generated content is a reviewable draft. The model cannot select tools, approve actions, submit applications, send messages, or change career data.";

export const CAREER_AI_DRAFT_ACTION_LABEL = "Action";
export const CAREER_AI_DRAFT_MESSAGE_LABEL = "Message";
export const CAREER_AI_DRAFT_CONSENT_LABEL =
  "I understand the draft is generated for manual review only and changes nothing.";

export const CAREER_AI_DRAFT_GENERATE_LABEL = "Generate AI draft";
export const CAREER_AI_DRAFT_REGENERATE_LABEL = "Regenerate draft";
export const CAREER_AI_DRAFT_COPY_LABEL = "Copy draft";
export const CAREER_AI_DRAFT_REVIEW_PROPOSALS_LABEL = "Review tool proposals";
export const CAREER_AI_DRAFT_CANCEL_LABEL = "Cancel";

export const CAREER_AI_DRAFT_IDLE_MESSAGE =
  "Select an action, write a message, confirm consent, and generate a structured draft.";
export const CAREER_AI_DRAFT_BLOCKED_MESSAGE =
  "Draft is blocked until consent, required inputs, and the CAREER_LLM_ENABLED flag are available.";
export const CAREER_AI_DRAFT_NO_BUNDLE_MESSAGE =
  "Load dashboard applications to provide a sanitized CareerBundle context.";
export const CAREER_AI_DRAFT_LOADING_MESSAGE = "Generating structured draft…";
export const CAREER_AI_DRAFT_DISABLED_MESSAGE =
  "Controlled LLM boundary is disabled. Enable CAREER_LLM_ENABLED locally to test.";

export const CAREER_AI_DRAFT_ACTION_LABELS: Record<CareerChatIntent, string> = {
  analyze_application_fit: "Analyze application fit",
  analyze_profile_gaps: "Analyze profile gaps",
  prepare_interview: "Prepare interview",
  analyze_resume: "Analisar currículo",
  analyze_ats_compatibility: "Verificar compatibilidade ATS",
  plan_career_strategy: "Planejar estratégia de carreira",
};
