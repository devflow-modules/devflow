import type { ProviderDerivedSignal } from "../provider-derived-signals/types.js";
import type {
  DeriveProviderDerivedCareerInsightsMetricsInput,
  ProviderDerivedCareerInsightsMetrics,
  ProviderDerivedConfidenceBucket,
  ProviderDerivedSignalKindCount,
} from "./types.js";

const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

function sortUniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function isReviewableSignal(signal: ProviderDerivedSignal): boolean {
  return (
    typeof signal.id === "string" &&
    signal.id.length > 0 &&
    (signal.source === "gmail" || signal.source === "calendar") &&
    typeof signal.kind === "string" &&
    signal.kind.length > 0 &&
    typeof signal.occurredAt === "string" &&
    signal.occurredAt.length > 0 &&
    typeof signal.confidence === "number" &&
    Number.isFinite(signal.confidence) &&
    signal.reviewRequired === true
  );
}

function confidenceBucket(confidence: number): ProviderDerivedConfidenceBucket {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return "high";
  }

  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return "medium";
  }

  return "low";
}

function buildKindCounts(signals: readonly ProviderDerivedSignal[]): ProviderDerivedSignalKindCount[] {
  const counts = new Map<string, number>();

  for (const signal of signals) {
    counts.set(signal.kind, (counts.get(signal.kind) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => ({
      kind: kind as ProviderDerivedSignalKindCount["kind"],
      count,
    }));
}

/**
 * Deterministic metrics from client-safe provider-derived signals.
 * Does not mutate input, call providers, or access environment configuration.
 */
export function deriveProviderDerivedCareerInsightsMetrics(
  input: DeriveProviderDerivedCareerInsightsMetricsInput,
): ProviderDerivedCareerInsightsMetrics {
  const selectedIds = new Set(sortUniqueIds(input.selectedSignalIds ?? []));
  const dismissedIds = new Set(sortUniqueIds(input.dismissedSignalIds ?? []));

  const reviewableSignals = input.signals.filter(isReviewableSignal);
  const activeReviewable = reviewableSignals.filter((signal) => !dismissedIds.has(signal.id));

  const selectedCount = activeReviewable.filter((signal) => selectedIds.has(signal.id)).length;
  const unselectedCount = activeReviewable.length - selectedCount;

  const confidenceBuckets: Record<ProviderDerivedConfidenceBucket, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  let confidenceSum = 0;

  for (const signal of activeReviewable) {
    confidenceBuckets[confidenceBucket(signal.confidence)] += 1;
    confidenceSum += signal.confidence;
  }

  const companies = [
    ...new Set(
      activeReviewable
        .map((signal) => signal.company?.trim())
        .filter((company): company is string => company != null && company.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

  return {
    totalSignals: input.signals.length,
    reviewableSignals: reviewableSignals.length,
    selectedCount,
    unselectedCount,
    dismissedCount: dismissedIds.size,
    gmailCount: activeReviewable.filter((signal) => signal.source === "gmail").length,
    calendarCount: activeReviewable.filter((signal) => signal.source === "calendar").length,
    kindCounts: buildKindCounts(activeReviewable),
    confidenceBuckets,
    averageConfidence:
      activeReviewable.length > 0
        ? Number((confidenceSum / activeReviewable.length).toFixed(4))
        : null,
    allReviewRequired: true,
    companies,
  };
}
