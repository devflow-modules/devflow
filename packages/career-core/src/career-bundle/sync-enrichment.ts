import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type {
  CareerBundleSyncEnrichmentAdapterInput,
  CareerBundleSyncEnrichmentAdapterResult,
} from "./types.js";

function collectPrivacyWarnings(
  privacy: CareerBundleUnifiedSyncEnrichment["privacy"] | undefined,
): { warnings: string[]; critical: boolean } {
  const warnings: string[] = [];
  let critical = false;

  if (!privacy || typeof privacy !== "object") {
    return {
      warnings: ["Sync enrichment is missing privacy metadata."],
      critical: true,
    };
  }

  if (privacy.rawRetained !== false) {
    warnings.push("privacy.rawRetained must be false for CareerBundle attachment.");
    critical = true;
  }
  if (privacy.redacted !== true) {
    warnings.push("privacy.redacted must be true for derived-only sync enrichment.");
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
    warnings.push("privacy.userReviewRequired must be true before app consumption.");
  }

  return { warnings, critical };
}

export function validateCareerBundleSyncEnrichment(
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null,
): CareerBundleSyncEnrichmentAdapterResult {
  if (syncEnrichment == null) {
    return { status: "not_provided", warnings: [] };
  }

  const { warnings, critical } = collectPrivacyWarnings(syncEnrichment.privacy);

  if (critical) {
    return { status: "invalid", warnings };
  }

  return {
    status: "provided",
    syncEnrichment,
    warnings,
  };
}

export function attachSyncEnrichmentToCareerBundle<TBundle extends object>(
  bundle: TBundle,
  input: CareerBundleSyncEnrichmentAdapterInput,
): TBundle & { syncEnrichment?: CareerBundleUnifiedSyncEnrichment } {
  const validation = validateCareerBundleSyncEnrichment(input.syncEnrichment);

  if (validation.status !== "provided" || !validation.syncEnrichment) {
    return { ...bundle };
  }

  return {
    ...bundle,
    syncEnrichment: validation.syncEnrichment,
  };
}

export function hasCareerBundleSyncEnrichment(bundle: {
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
}): boolean {
  return bundle.syncEnrichment != null;
}
