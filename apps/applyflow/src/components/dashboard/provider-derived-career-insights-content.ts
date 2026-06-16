export const PROVIDER_DERIVED_CAREER_INSIGHTS_TITLE = "Provider-derived career insights";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_READ_ONLY = "Read-only";
export const PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_DERIVED = "Derived metadata";
export const PROVIDER_DERIVED_CAREER_INSIGHTS_BADGE_NO_AUTO = "No auto-apply";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_DESCRIPTION =
  "Aggregated, client-safe metrics from provider-derived signals already loaded in this session. Insights are derived from permitted metadata only — not full Gmail or Calendar content.";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_MANUAL_REVIEW =
  "Human review remains required before any enrichment proposal or export.";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_NO_CAREER_BUNDLE =
  "No changes were applied to your CareerBundle.";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_NO_APPLICATIONS =
  "No applications were modified.";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_NO_PERSISTENCE =
  "Nothing is saved automatically — this panel reflects the current in-memory session only.";

export const PROVIDER_DERIVED_CAREER_INSIGHTS_PHASE_MESSAGES = {
  no_valid_connection:
    "Connect Gmail and Calendar with explicit consent before insights can be derived.",
  connected_idle: "Connections are ready. Run the read-only preview to derive insights.",
  preview_loading: "Deriving client-safe signals…",
  preview_blocked: "Preview was blocked. Insights are unavailable until the runtime gate passes.",
  preview_error: "Preview failed safely. Insights are unavailable.",
  preview_without_signals: "Preview completed with no reviewable signals.",
  awaiting_review: "Signals are available and awaiting your manual review.",
  review_in_progress: "Review in progress — select or dismiss signals before marking ready.",
  review_ready_no_selection: "Mark your selection ready when you have chosen signals.",
  selection_ready: "Selection is ready. You may build an enrichment proposal.",
  proposal_ready: "Enrichment proposal is ready in memory. Export is available when valid.",
  export_available: "A valid enrichment proposal can be exported locally.",
  preview_partial:
    "Preview returned partial results. Review signals carefully before proceeding.",
} as const;
