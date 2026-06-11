import type { CareerSyncSignal } from "../shared/types.js";
import type { NangoGmailMessageLike } from "../nango/types.js";
import type { RawGmailMessageLike } from "../shared/types.js";

export type GmailSyncPreviewInput = {
  messages: RawGmailMessageLike[];
};

export type NangoGmailSyncPreviewInput = {
  messages: NangoGmailMessageLike[];
};

export type GmailSyncPreview = {
  source: "gmail";
  totalMessages: number;
  signalCount: number;
  actionRequiredCount: number;
  stageCounts: Record<string, number>;
  companyHints: string[];
  signals: CareerSyncSignal[];
  privacy: {
    rawRetained: false;
    redacted: true;
  };
};

export type CareerBundleSyncEnrichment = {
  source: "gmail";
  signals: CareerSyncSignal[];
  summary: string;
  generatedAt: string;
  rawRetained: false;
};

export type CareerBundleGmailEnrichment = CareerBundleSyncEnrichment;

export type BuildCareerBundleGmailEnrichmentOptions = {
  generatedAt?: string;
};
