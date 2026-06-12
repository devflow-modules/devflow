import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import type { CareerBundle as CareerBundleBase } from "../schemas/careerBundle.js";

export type CareerBundleSyncEnrichmentStatus = "not_provided" | "provided" | "invalid";

export type CareerBundleSyncEnrichmentAdapterInput = {
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
};

export type CareerBundleSyncEnrichmentAdapterResult = {
  status: CareerBundleSyncEnrichmentStatus;
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment;
  warnings: string[];
};

/** CareerBundle with optional derived sync enrichment attached by the adapter. */
export type CareerBundleWithSyncEnrichment = CareerBundleBase & {
  syncEnrichment?: CareerBundleUnifiedSyncEnrichment;
};
