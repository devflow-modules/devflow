export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_TITLE = "Enrichment change preview";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_READ_ONLY = "Read-only preview";
export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_BADGE_NO_APPLY = "No auto-apply";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_DESCRIPTION =
  "Compare your current CareerBundle sync enrichment (if any) with the proposed enrichment from selected signals.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_READ_ONLY_MESSAGE =
  "This is only a preview of suggested changes. Nothing was applied to your profile.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CAREER_BUNDLE =
  "No information was applied to your CareerBundle.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_APPLICATIONS =
  "No applications were modified.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_MANUAL_REVIEW =
  "Human review remains required before any export or future apply workflow.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_EMPTY_PROPOSAL =
  "Build a ready enrichment proposal to preview suggested changes.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_INVALID_PROPOSAL =
  "The current proposal cannot be previewed safely.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_NO_CHANGES =
  "No differences detected between current and proposed enrichment.";

export const PROVIDER_DERIVED_ENRICHMENT_CHANGE_PREVIEW_STATUS_LABELS = {
  unchanged: "Unchanged",
  missing_current_value: "Missing current value",
  additive_suggestion: "Additive suggestion",
  replacement_suggestion: "Replacement suggestion",
  conflict: "Conflict",
  unsupported: "Unsupported",
  insufficient_confidence: "Low confidence",
  excluded_by_user: "Excluded by user",
} as const;
