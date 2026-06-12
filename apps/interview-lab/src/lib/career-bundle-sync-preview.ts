import {
  parseCareerBundle,
  parseCareerBundleWithSyncEnrichment,
  validateCareerBundleSyncEnrichment,
  type CareerBundle,
  type CareerBundleSyncEnrichmentStatus,
  type CareerBundleUnifiedSyncEnrichment,
  type ParseCareerBundleWithSyncEnrichmentResult,
} from "@devflow/career-core";

export type InterviewLabSyncEnrichmentPreview = {
  available: boolean;
  status: CareerBundleSyncEnrichmentStatus;
  summary?: string;
  totalSignals?: number;
  actionRequiredCount?: number;
  upcomingCount?: number;
  companyHints?: string[];
  sourceCounts?: Record<string, number>;
  stageCounts?: Record<string, number>;
  privacy?: {
    rawRetained: false;
    redacted: true;
    meetingLinksRemoved: true;
    providerPayloadRetained: false;
    userReviewRequired: true;
  };
  warnings: string[];
};

export const EMPTY_SYNC_ENRICHMENT_PREVIEW: InterviewLabSyncEnrichmentPreview = {
  available: false,
  status: "not_provided",
  warnings: [],
};

export function buildInterviewLabSyncEnrichmentPreview(
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null,
): InterviewLabSyncEnrichmentPreview {
  const validation = validateCareerBundleSyncEnrichment(syncEnrichment);

  if (validation.status === "not_provided") {
    return EMPTY_SYNC_ENRICHMENT_PREVIEW;
  }

  if (validation.status === "invalid") {
    return {
      available: false,
      status: "invalid",
      warnings: validation.warnings,
    };
  }

  const enrichment = validation.syncEnrichment!;
  return {
    available: true,
    status: "provided",
    summary: enrichment.summary,
    totalSignals: enrichment.stats.totalSignals,
    actionRequiredCount: enrichment.stats.actionRequiredCount,
    upcomingCount: enrichment.stats.upcomingCount,
    companyHints: enrichment.stats.companyHints,
    sourceCounts: enrichment.stats.sourceCounts,
    stageCounts: enrichment.stats.stageCounts,
    privacy: enrichment.privacy,
    warnings: validation.warnings,
  };
}

export function buildInterviewLabSyncEnrichmentPreviewFromParseResult(
  result: Extract<ParseCareerBundleWithSyncEnrichmentResult, { ok: true }>,
): InterviewLabSyncEnrichmentPreview {
  if (result.syncEnrichmentStatus === "provided" && result.data.syncEnrichment) {
    return buildInterviewLabSyncEnrichmentPreview(result.data.syncEnrichment);
  }

  if (result.syncEnrichmentStatus === "invalid") {
    return {
      available: false,
      status: "invalid",
      warnings: result.warnings,
    };
  }

  return EMPTY_SYNC_ENRICHMENT_PREVIEW;
}

export type ParseCareerBundleImportWithSyncPreviewResult =
  | { ok: true; bundle: CareerBundle; preview: InterviewLabSyncEnrichmentPreview }
  | { ok: false; error: string };

export function parseCareerBundleImportWithSyncPreview(
  parsed: unknown,
): ParseCareerBundleImportWithSyncPreviewResult {
  const withSync = parseCareerBundleWithSyncEnrichment(parsed);
  if (!withSync.ok) {
    return { ok: false, error: withSync.error };
  }

  const base = parseCareerBundle(parsed);
  if (!base.ok) {
    return { ok: false, error: base.error };
  }

  return {
    ok: true,
    bundle: base.data,
    preview: buildInterviewLabSyncEnrichmentPreviewFromParseResult(withSync),
  };
}
