import type { CareerSyncSignal } from "../shared/types.js";
import type { CareerBundleCalendarEnrichment } from "../calendar-sync/types.js";
import type { CareerBundleGmailEnrichment } from "../gmail-sync/types.js";

export type CareerBundleSyncSource = "gmail" | "calendar";

export type CareerBundleSyncPrivacy = {
  rawRetained: false;
  redacted: true;
  meetingLinksRemoved: true;
  providerPayloadRetained: false;
  userReviewRequired: true;
};

export type CareerBundleSyncSummary = {
  totalSignals: number;
  actionRequiredCount: number;
  upcomingCount: number;
  stageCounts: Record<string, number>;
  sourceCounts: Record<CareerBundleSyncSource, number>;
  companyHints: string[];
};

export type CareerBundleUnifiedSyncEnrichment = {
  source: "sync";
  gmail?: CareerBundleGmailEnrichment;
  calendar?: CareerBundleCalendarEnrichment;
  combinedSignals: CareerSyncSignal[];
  summary: string;
  stats: CareerBundleSyncSummary;
  generatedAt: string;
  privacy: CareerBundleSyncPrivacy;
};
