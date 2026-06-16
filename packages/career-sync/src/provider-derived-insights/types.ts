import type { ProviderDerivedSignalKind } from "../provider-derived-signals/types.js";

export type ProviderDerivedConfidenceBucket = "high" | "medium" | "low";

export type ProviderDerivedSignalKindCount = {
  kind: ProviderDerivedSignalKind;
  count: number;
};

/**
 * Pure, client-safe metrics derived from provider-derived signals and review selection.
 * Does not include provider identifiers, raw payloads, or persistence flags.
 */
export type ProviderDerivedCareerInsightsMetrics = {
  totalSignals: number;
  reviewableSignals: number;
  selectedCount: number;
  unselectedCount: number;
  dismissedCount: number;
  gmailCount: number;
  calendarCount: number;
  kindCounts: ProviderDerivedSignalKindCount[];
  confidenceBuckets: Record<ProviderDerivedConfidenceBucket, number>;
  averageConfidence: number | null;
  allReviewRequired: true;
  companies: string[];
};

export type DeriveProviderDerivedCareerInsightsMetricsInput = {
  signals: readonly import("../provider-derived-signals/types.js").ProviderDerivedSignal[];
  selectedSignalIds?: readonly string[];
  dismissedSignalIds?: readonly string[];
};
