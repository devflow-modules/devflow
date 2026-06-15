import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { validateCareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type {
  CareerBundleSyncEnrichmentAdapterInput,
  CareerBundleSyncEnrichmentAdapterResult,
} from "./types.js";

export function validateCareerBundleSyncEnrichment(
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null,
): CareerBundleSyncEnrichmentAdapterResult {
  if (syncEnrichment == null) {
    return { status: "not_provided", warnings: [] };
  }

  const validation = validateCareerBundleUnifiedSyncEnrichment(syncEnrichment);

  if (!validation.valid) {
    return {
      status: "invalid",
      warnings: [...validation.errors, ...validation.warnings],
    };
  }

  return {
    status: "provided",
    syncEnrichment: validation.value,
    warnings: validation.warnings,
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
