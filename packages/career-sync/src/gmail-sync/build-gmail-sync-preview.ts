import { extractGmailSignals } from "../gmail/extract-gmail-signals.js";
import { extractSignalsFromNangoGmail } from "../nango/sandbox.js";
import { shouldRetainRawProviderData } from "../privacy/filters.js";
import type {
  BuildCareerBundleGmailEnrichmentOptions,
  CareerBundleSyncEnrichment,
  GmailSyncPreview,
  GmailSyncPreviewInput,
  NangoGmailSyncPreviewInput,
} from "./types.js";
import type { CareerSyncSignal } from "../shared/types.js";
import { countStages, dedupeCompanyHints, summarizeGmailSignals } from "./summarize-gmail-signals.js";

function buildPreview(totalMessages: number, signals: CareerSyncSignal[]): GmailSyncPreview {
  return {
    source: "gmail",
    totalMessages,
    signalCount: signals.length,
    actionRequiredCount: signals.filter((s) => s.actionRequired).length,
    stageCounts: countStages(signals),
    companyHints: dedupeCompanyHints(signals),
    signals,
    privacy: {
      rawRetained: shouldRetainRawProviderData(),
      redacted: true,
    },
  };
}

export function buildGmailSyncPreview(input: GmailSyncPreviewInput): GmailSyncPreview {
  const signals = extractGmailSignals(input.messages);
  return buildPreview(input.messages.length, signals);
}

export function buildNangoGmailSyncPreview(input: NangoGmailSyncPreviewInput): GmailSyncPreview {
  const signals = extractSignalsFromNangoGmail(input.messages);
  return buildPreview(input.messages.length, signals);
}

export function buildCareerBundleGmailEnrichment(
  signals: CareerSyncSignal[],
  options?: BuildCareerBundleGmailEnrichmentOptions,
): CareerBundleSyncEnrichment {
  return {
    source: "gmail",
    signals,
    summary: summarizeGmailSignals(signals),
    generatedAt: options?.generatedAt ?? "1970-01-01T00:00:00.000Z",
    rawRetained: shouldRetainRawProviderData(),
  };
}
