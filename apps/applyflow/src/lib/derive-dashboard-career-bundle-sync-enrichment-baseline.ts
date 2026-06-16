import type { ApplyFlowApplication } from "@devflow/applyflow-core";
import type { CareerBundleUnifiedSyncEnrichment } from "@devflow/career-sync";
import { deriveDashboardCareerBundleExportComposition } from "./derive-dashboard-career-bundle-export-composition";

export type DeriveDashboardCareerBundleSyncEnrichmentBaselineInput = {
  applications: readonly ApplyFlowApplication[];
  includeDemoSyncEnrichment: boolean;
  eligibleProviderEnrichment?: CareerBundleUnifiedSyncEnrichment | null;
};

/**
 * Derives the optional current sync enrichment baseline from the dashboard's
 * in-memory applications export shape. Returns null when no valid baseline exists.
 */
export function deriveDashboardCareerBundleSyncEnrichmentBaseline(
  input: DeriveDashboardCareerBundleSyncEnrichmentBaselineInput,
): CareerBundleUnifiedSyncEnrichment | null {
  return deriveDashboardCareerBundleExportComposition({
    applications: input.applications,
    includeDemoSyncEnrichment: input.includeDemoSyncEnrichment,
    eligibleProviderEnrichment: input.eligibleProviderEnrichment ?? null,
  }).syncEnrichment;
}
