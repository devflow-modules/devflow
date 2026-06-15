import { buildCareerBundleSyncEnrichment } from "../career-bundle/build-career-bundle-sync-enrichment.js";
import type { CareerBundleUnifiedSyncEnrichment } from "../career-bundle/types.js";
import { buildCareerBundleCalendarEnrichment } from "../calendar-sync/build-calendar-sync-preview.js";
import { buildCareerBundleGmailEnrichment } from "../gmail-sync/build-gmail-sync-preview.js";
import type { ProviderDerivedSignalSummary } from "../provider-derived-signals/types.js";
import { mapProviderDerivedSignalsToCareerSyncSignals } from "./mapping.js";
import type {
  ProviderDerivedEnrichmentAdapterInput,
  ProviderDerivedEnrichmentAdapterResult,
} from "./types.js";

const COMPLETED_MESSAGE =
  "Sandbox provider-derived signals were adapted to CareerBundle sync enrichment safely.";

const BLOCKED_MESSAGE =
  "Sandbox provider-derived signal composition is not ready for enrichment adaptation.";

const ERROR_MESSAGE = "Provider-derived enrichment adaptation failed safely.";

function createAdapterSafetyFlags(): Pick<
  ProviderDerivedEnrichmentAdapterResult,
  "runtime" | "safeForClient" | "deterministic" | "userReviewRequired"
> {
  return {
    runtime: "sandbox",
    safeForClient: true,
    deterministic: true,
    userReviewRequired: true,
  };
}

function collectPrivacyValidationWarnings(
  enrichment: CareerBundleUnifiedSyncEnrichment,
): { warnings: string[]; critical: boolean } {
  const warnings: string[] = [];
  let critical = false;
  const { privacy } = enrichment;

  if (privacy.rawRetained !== false) {
    warnings.push("privacy.rawRetained must be false.");
    critical = true;
  }
  if (privacy.redacted !== true) {
    warnings.push("privacy.redacted must be true.");
  }
  if (privacy.meetingLinksRemoved !== true) {
    warnings.push("privacy.meetingLinksRemoved must be true.");
    critical = true;
  }
  if (privacy.providerPayloadRetained !== false) {
    warnings.push("privacy.providerPayloadRetained must be false.");
    critical = true;
  }
  if (privacy.userReviewRequired !== true) {
    warnings.push("privacy.userReviewRequired must be true.");
  }

  for (const signal of enrichment.combinedSignals) {
    if (signal.rawRetained !== false) {
      warnings.push("combinedSignals must not retain raw provider data.");
      critical = true;
      break;
    }
    if (signal.providerId != null) {
      warnings.push("combinedSignals must not include provider identifiers.");
      critical = true;
      break;
    }
  }

  return { warnings, critical };
}

export function validateAdaptedCareerBundleSyncEnrichment(
  enrichment: CareerBundleUnifiedSyncEnrichment,
  expectedSummary?: ProviderDerivedSignalSummary,
): { valid: boolean; warnings: string[] } {
  const { warnings, critical } = collectPrivacyValidationWarnings(enrichment);

  if (critical) {
    return { valid: false, warnings };
  }

  if (expectedSummary) {
    if (enrichment.stats.totalSignals !== expectedSummary.totalSignals) {
      warnings.push("stats.totalSignals does not match composition summary.");
      return { valid: false, warnings };
    }
    if (enrichment.stats.sourceCounts.gmail !== expectedSummary.gmailSignalCount) {
      warnings.push("stats.sourceCounts.gmail does not match composition summary.");
      return { valid: false, warnings };
    }
    if (enrichment.stats.sourceCounts.calendar !== expectedSummary.calendarSignalCount) {
      warnings.push("stats.sourceCounts.calendar does not match composition summary.");
      return { valid: false, warnings };
    }
    const companyHints = [...expectedSummary.companies].sort((left, right) =>
      left.localeCompare(right),
    );
    if (JSON.stringify(enrichment.stats.companyHints) !== JSON.stringify(companyHints)) {
      warnings.push("stats.companyHints does not match composition summary.");
      return { valid: false, warnings };
    }
  }

  return { valid: true, warnings };
}

function buildUnifiedSyncEnrichment(input: {
  signals: ProviderDerivedEnrichmentAdapterInput["composition"]["signals"];
  generatedAt: string;
}): CareerBundleUnifiedSyncEnrichment {
  const careerSyncSignals = mapProviderDerivedSignalsToCareerSyncSignals(input.signals);
  const gmailSignals = careerSyncSignals.filter((signal) => signal.source === "gmail");
  const calendarSignals = careerSyncSignals.filter((signal) => signal.source === "calendar");

  const enrichmentInput: Parameters<typeof buildCareerBundleSyncEnrichment>[0] = {};

  if (gmailSignals.length > 0) {
    enrichmentInput.gmail = buildCareerBundleGmailEnrichment(gmailSignals, {
      generatedAt: input.generatedAt,
    });
  }

  if (calendarSignals.length > 0) {
    enrichmentInput.calendar = buildCareerBundleCalendarEnrichment(calendarSignals, {
      generatedAt: input.generatedAt,
    });
  }

  return buildCareerBundleSyncEnrichment(enrichmentInput, {
    generatedAt: input.generatedAt,
    now: input.generatedAt,
  });
}

export function adaptProviderDerivedSignalsToSyncEnrichment(
  input: ProviderDerivedEnrichmentAdapterInput,
): ProviderDerivedEnrichmentAdapterResult {
  const sourceSignalCount = input.composition.signals.length;

  if (input.composition.status !== "completed") {
    return {
      ...createAdapterSafetyFlags(),
      status: "blocked",
      sourceSignalCount,
      warnings: ["composition_not_completed"],
      messages: [BLOCKED_MESSAGE],
    };
  }

  try {
    const enrichment = buildUnifiedSyncEnrichment({
      signals: input.composition.signals,
      generatedAt: input.generatedAt,
    });

    const validation = validateAdaptedCareerBundleSyncEnrichment(
      enrichment,
      input.composition.summary,
    );

    if (!validation.valid) {
      return {
        ...createAdapterSafetyFlags(),
        status: "error",
        sourceSignalCount,
        warnings: ["adapted_sync_enrichment_validation_failed", ...validation.warnings],
        messages: [ERROR_MESSAGE],
      };
    }

    return {
      ...createAdapterSafetyFlags(),
      status: "completed",
      sourceSignalCount,
      enrichment,
      warnings: validation.warnings,
      messages: [COMPLETED_MESSAGE],
    };
  } catch {
    return {
      ...createAdapterSafetyFlags(),
      status: "error",
      sourceSignalCount,
      warnings: ["adapted_sync_enrichment_build_failed"],
      messages: [ERROR_MESSAGE],
    };
  }
}
