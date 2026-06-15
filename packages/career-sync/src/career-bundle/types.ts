import type { CareerBundleCalendarEnrichment } from "../calendar-sync/types.js";
import type { CareerBundleGmailEnrichment } from "../gmail-sync/types.js";

export type {
  CareerBundleSyncPrivacy,
  CareerBundleSyncSource,
  CareerBundleSyncSummary,
  CareerBundleUnifiedSyncEnrichment,
} from "../unified-sync-enrichment/types.js";

export type CareerBundleSyncEnrichmentInput = {
  gmail?: CareerBundleGmailEnrichment;
  calendar?: CareerBundleCalendarEnrichment;
};

export type BuildCareerBundleSyncEnrichmentOptions = {
  generatedAt?: string;
  now?: string;
};
