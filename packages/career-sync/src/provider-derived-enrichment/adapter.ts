import { buildCareerBundleSyncEnrichment } from "../career-bundle/build-career-bundle-sync-enrichment.js";
import type { CareerBundleUnifiedSyncEnrichment } from "../unified-sync-enrichment/types.js";
import { validateCareerBundleUnifiedSyncEnrichment } from "../unified-sync-enrichment/validation.js";
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

export function validateAdaptedCareerBundleSyncEnrichment(
  enrichment: CareerBundleUnifiedSyncEnrichment,
  expectedSummary?: ProviderDerivedSignalSummary,
): { valid: boolean; warnings: string[] } {
  const validation = validateCareerBundleUnifiedSyncEnrichment(enrichment, {
    expectedSummary,
    rejectProviderIdentifiers: true,
  });

  if (!validation.valid) {
    return {
      valid: false,
      warnings: [...validation.errors, ...validation.warnings],
    };
  }

  return {
    valid: true,
    warnings: validation.warnings,
  };
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
