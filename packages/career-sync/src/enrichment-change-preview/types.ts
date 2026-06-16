import type { SyncConfidence } from "../shared/types.js";

export const ENRICHMENT_CHANGE_PREVIEW_MAX_ITEMS = 20;
export const ENRICHMENT_CHANGE_PREVIEW_MAX_LIST_ITEMS = 15;
export const ENRICHMENT_CHANGE_PREVIEW_MAX_STRING_LENGTH = 200;
export const ENRICHMENT_CHANGE_PREVIEW_MAX_WARNINGS_PER_ITEM = 5;

/**
 * Signals with `low` confidence are not sufficient to support a suggestion
 * without explicit human review of the underlying selection.
 */
export const ENRICHMENT_CHANGE_PREVIEW_MIN_CONFIDENCE: SyncConfidence = "medium";

export const ENRICHMENT_CHANGE_PREVIEW_FIELDS = [
  "stats.totalSignals",
  "stats.actionRequiredCount",
  "stats.upcomingCount",
  "stats.sourceCounts.gmail",
  "stats.sourceCounts.calendar",
  "stats.companyHints",
  "combinedSignals.count",
  "summary",
] as const;

export type EnrichmentChangePreviewField =
  (typeof ENRICHMENT_CHANGE_PREVIEW_FIELDS)[number];

export type EnrichmentChangePreviewStatus =
  | "unchanged"
  | "missing_current_value"
  | "additive_suggestion"
  | "replacement_suggestion"
  | "conflict"
  | "unsupported"
  | "insufficient_confidence"
  | "excluded_by_user";

export type SafeDisplayValue =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "list"; value: string[] };

export type EnrichmentChangePreviewItem = {
  field: EnrichmentChangePreviewField;
  label: string;
  status: EnrichmentChangePreviewStatus;
  currentValue: SafeDisplayValue;
  suggestedValue: SafeDisplayValue;
  confidence?: SyncConfidence;
  sourceSignalCount: number;
  warnings: string[];
};

export type EnrichmentChangePreviewResult = {
  status: "ready" | "empty" | "invalid" | "unsupported";
  safeForClient: true;
  readOnly: true;
  appliedToCareerBundle: false;
  appliedToApplications: false;
  persisted: false;
  items: EnrichmentChangePreviewItem[];
  statusCounts: Record<EnrichmentChangePreviewStatus, number>;
  messages: string[];
  warnings: string[];
};

export type DeriveEnrichmentChangePreviewInput = {
  current: import("../unified-sync-enrichment/types.js").CareerBundleUnifiedSyncEnrichment | null | undefined;
  proposed: import("../unified-sync-enrichment/types.js").CareerBundleUnifiedSyncEnrichment | null | undefined;
  excludedSignalIds?: readonly string[];
};
