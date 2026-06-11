import type {
  BuildCareerBundleSyncEnrichmentOptions,
  CareerBundleSyncEnrichmentInput,
  CareerBundleSyncPrivacy,
  CareerBundleUnifiedSyncEnrichment,
} from "./types.js";
import {
  buildCareerBundleSyncSummary,
  CAREER_BUNDLE_SYNC_DEFAULT_NOW,
  sortCombinedSignals,
  summarizeCareerBundleSync,
} from "./summarize-career-bundle-sync.js";

const SYNC_PRIVACY: CareerBundleSyncPrivacy = {
  rawRetained: false,
  redacted: true,
  meetingLinksRemoved: true,
  providerPayloadRetained: false,
  userReviewRequired: true,
};

export function buildCareerBundleSyncEnrichment(
  input: CareerBundleSyncEnrichmentInput,
  options?: BuildCareerBundleSyncEnrichmentOptions,
): CareerBundleUnifiedSyncEnrichment {
  const generatedAt = options?.generatedAt ?? CAREER_BUNDLE_SYNC_DEFAULT_NOW;
  const now = options?.now ?? generatedAt;

  const gmailSignals = input.gmail?.signals ?? [];
  const calendarSignals = input.calendar?.signals ?? [];
  const combinedSignals = sortCombinedSignals([...gmailSignals, ...calendarSignals]);
  const stats = buildCareerBundleSyncSummary(combinedSignals, now);

  const enrichment: CareerBundleUnifiedSyncEnrichment = {
    source: "sync",
    combinedSignals,
    summary: summarizeCareerBundleSync(combinedSignals, stats),
    stats,
    generatedAt,
    privacy: SYNC_PRIVACY,
  };

  if (input.gmail) {
    enrichment.gmail = input.gmail;
  }
  if (input.calendar) {
    enrichment.calendar = input.calendar;
  }

  return enrichment;
}
