export const PROVIDER_INSIGHTS_TIMELINE_TITLE = "Provider insights timeline";
export const PROVIDER_INSIGHTS_TIMELINE_BADGE_READ_ONLY = "Read-only";
export const PROVIDER_INSIGHTS_TIMELINE_BADGE_IN_MEMORY = "In-memory only";
export const PROVIDER_INSIGHTS_TIMELINE_BADGE_NO_AUTO = "No automatic changes";

export const PROVIDER_INSIGHTS_TIMELINE_DESCRIPTION =
  "A consolidated, read-only timeline of provider-derived signals from the current preview session.";

export const PROVIDER_INSIGHTS_TIMELINE_DISCLAIMER =
  "These signals are derived from limited metadata. They are suggestions for review, not confirmed application status changes.";

export const PROVIDER_INSIGHTS_TIMELINE_EMPTY_NO_PREVIEW =
  "Run the read-only preview to load the provider insights timeline.";
export const PROVIDER_INSIGHTS_TIMELINE_EMPTY_BLOCKED =
  "Timeline is unavailable while the preview is blocked. Connect and verify Gmail and Calendar first.";
export const PROVIDER_INSIGHTS_TIMELINE_EMPTY_ZERO_SIGNALS =
  "No signals were produced by this preview.";
export const PROVIDER_INSIGHTS_TIMELINE_EMPTY_FILTER =
  "No signals match the selected filter.";

export const PROVIDER_INSIGHTS_TIMELINE_FILTER_LABEL = "Filter timeline";
export const PROVIDER_INSIGHTS_TIMELINE_FILTERED_COUNT_LABEL = "Filtered signals";
export const PROVIDER_INSIGHTS_TIMELINE_SUMMARY_TITLE = "Summary";

export const PROVIDER_INSIGHTS_TIMELINE_FILTER_LABELS = {
  all: "All",
  gmail: "Gmail",
  calendar: "Calendar",
  correlation: "Correlation",
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
} as const;
