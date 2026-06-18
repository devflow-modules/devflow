import type { CareerAutomationKind } from "@devflow/career-core";

export const APPROVED_AUTOMATION_REVIEW_TITLE = "Approved Automation Review";

export const APPROVED_AUTOMATION_REVIEW_DESCRIPTION =
  "Run a single, explicitly approved, non-destructive automation. The server resolves the tool, capability, policy, and approval — the client never selects them.";

export const APPROVED_AUTOMATION_REVIEW_DISCLAIMER =
  "Automations run only after policy validation and explicit approval. No application, message, profile, provider, or external system is changed automatically.";

export const APPROVED_AUTOMATION_KIND_LABELS: Record<CareerAutomationKind, string> = {
  prepare_application_review: "Prepare application fit review",
  prepare_profile_gap_review: "Prepare profile gap review",
  prepare_interview_plan: "Prepare interview plan",
  prepare_review_export: "Prepare review export (approval required)",
};

export const APPROVED_AUTOMATION_KIND_LABEL = "Automation";
export const APPROVED_AUTOMATION_APPROVE_ONCE_LABEL = "Approve once";
export const APPROVED_AUTOMATION_RUN_LABEL = "Run approved automation";
export const APPROVED_AUTOMATION_CANCEL_LABEL = "Cancel";
export const APPROVED_AUTOMATION_COPY_LABEL = "Copy result";
export const APPROVED_AUTOMATION_REVIEW_OUTPUT_LABEL = "Review output";

export const APPROVED_AUTOMATION_BADGE_MANUAL = "Manual review";
export const APPROVED_AUTOMATION_BADGE_SINGLE = "Single execution";

export const APPROVED_AUTOMATION_NO_BUNDLE_MESSAGE =
  "Load a CareerBundle with at least one application to prepare an automation.";
export const APPROVED_AUTOMATION_IDLE_MESSAGE =
  "Approve once, then run the approved automation. Approval is request-scoped and never remembered.";
export const APPROVED_AUTOMATION_APPROVAL_REQUIRED_MESSAGE =
  "Explicit approval is required before this automation can run.";
export const APPROVED_AUTOMATION_RUNNING_MESSAGE = "Running approved automation…";
export const APPROVED_AUTOMATION_BLOCKED_MESSAGE =
  "Automation blocked by policy. Review the warnings and trace below.";
export const APPROVED_AUTOMATION_CANCELLED_MESSAGE =
  "Approval cleared. Nothing was executed, scheduled, or persisted.";
export const APPROVED_AUTOMATION_ALREADY_RUNNING_MESSAGE =
  "An execution is already in progress for this approval.";
export const APPROVED_AUTOMATION_ERROR_MESSAGE = "Approved automation failed safely.";
